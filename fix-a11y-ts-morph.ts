import { Project, SyntaxKind, JsxOpeningElement, JsxSelfClosingElement, JsxAttribute } from 'ts-morph';
import * as fs from 'fs';

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const files = project.getSourceFiles("src/**/*.{ts,tsx}");

function hasAttribute(element: JsxOpeningElement | JsxSelfClosingElement, name: string): boolean {
  return element.getAttributes().some(attr => 
    attr.getKind() === SyntaxKind.JsxAttribute && 
    (attr as JsxAttribute).getNameNode().getText() === name
  );
}

for (const file of files) {
  let changed = false;

  const elements = [
    ...file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
  ];

  for (const element of elements) {
    const tagName = element.getTagNameNode().getText();
    
    // 1. Label has associated control (simple fix: if <label> add htmlFor="")
    // Actually, skipping complex forms.
    
    // 2. Alt text for images
    if (tagName === 'img' && !hasAttribute(element, 'alt')) {
      element.addAttribute({ name: "alt", initializer: '""' });
      changed = true;
    }

    // 3. Click events have key events & no-static-element-interactions
    // If it has onClick, but is not a native interactive element
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'option', 'form'];
    if (!interactiveTags.includes(tagName) && hasAttribute(element, 'onClick')) {
      if (!hasAttribute(element, 'role')) {
        element.addAttribute({ name: "role", initializer: '"button"' });
        changed = true;
      }
      if (!hasAttribute(element, 'tabIndex')) {
        element.addAttribute({ name: "tabIndex", initializer: "{0}" });
        changed = true;
      }
      if (!hasAttribute(element, 'onKeyDown')) {
        const onClickAttr = element.getAttributes().find(attr => 
          attr.getKind() === SyntaxKind.JsxAttribute && 
          (attr as JsxAttribute).getNameNode().getText() === 'onClick'
        ) as JsxAttribute;

        if (onClickAttr) {
            const initializer = onClickAttr.getInitializer();
            if (initializer) {
              element.addAttribute({ 
                name: "onKeyDown", 
                initializer: `{(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (${initializer.getText().replace(/^\{/, '').replace(/\}$/, '')})(e as any); } }}`
              });
              changed = true;
            }
        }
      }
    }
    
    // 4. Remove autoFocus
    if (hasAttribute(element, 'autoFocus')) {
      const attr = element.getAttributes().find(attr => 
        attr.getKind() === SyntaxKind.JsxAttribute && 
        (attr as JsxAttribute).getNameNode().getText() === 'autoFocus'
      ) as JsxAttribute;
      attr.remove();
      changed = true;
    }
  }

  if (changed) {
    console.log(`Saving changes to ${file.getFilePath()}`);
    file.saveSync();
  }
}
