import { Project, SyntaxKind, JsxOpeningElement, JsxSelfClosingElement, JsxAttribute, JsxElement } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const files = project.getSourceFiles("src/**/*.{ts,tsx}");

let labelCounter = 0;

function hasAttribute(element: JsxOpeningElement | JsxSelfClosingElement, name: string): boolean {
  return element.getAttributes().some(attr => 
    attr.getKind() === SyntaxKind.JsxAttribute && 
    (attr as JsxAttribute).getNameNode().getText() === name
  );
}

for (const file of files) {
  let changed = false;

  const elements = [
    ...file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
  ];

  for (const element of elements) {
    const tagName = element.getTagNameNode().getText();
    
    // Fix: Label has associated control
    if (tagName === 'label' && !hasAttribute(element, 'htmlFor')) {
      const jsxElement = element.getParentIfKind(SyntaxKind.JsxElement);
      if (jsxElement) {
        // If label doesn't contain a control (input, select, textarea, button), it needs htmlFor.
        // Let's check its children.
        const children = jsxElement.getJsxChildren();
        const hasControlChild = children.some(child => {
            if (child.getKind() === SyntaxKind.JsxElement) {
                const name = (child as JsxElement).getOpeningElement().getTagNameNode().getText();
                return ['input', 'select', 'textarea', 'button'].includes(name);
            }
            if (child.getKind() === SyntaxKind.JsxSelfClosingElement) {
                const name = (child as JsxSelfClosingElement).getTagNameNode().getText();
                return ['input', 'select', 'textarea', 'button'].includes(name);
            }
            return false;
        });

        if (!hasControlChild) {
           // We need to associate it with a control. Often the control is the next sibling of the label in its parent.
           const parent = jsxElement.getParentIfKind(SyntaxKind.JsxElement);
           if (parent) {
               const siblings = parent.getJsxChildren();
               const index = siblings.indexOf(jsxElement);
               if (index !== -1 && index + 1 < siblings.length) {
                   // Find the next element
                   for(let i = index + 1; i < siblings.length; i++) {
                       const sibling = siblings[i];
                       let control: JsxOpeningElement | JsxSelfClosingElement | null = null;
                       if (sibling.getKind() === SyntaxKind.JsxElement) {
                           const name = (sibling as JsxElement).getOpeningElement().getTagNameNode().getText();
                           if (['input', 'select', 'textarea', 'button'].includes(name)) {
                               control = (sibling as JsxElement).getOpeningElement();
                           }
                       } else if (sibling.getKind() === SyntaxKind.JsxSelfClosingElement) {
                           const name = (sibling as JsxSelfClosingElement).getTagNameNode().getText();
                           if (['input', 'select', 'textarea', 'button'].includes(name)) {
                               control = (sibling as JsxSelfClosingElement);
                           }
                       }

                       if (control) {
                           labelCounter++;
                           const idValue = `"a11y-control-\${labelCounter}"`;
                           let hasId = false;
                           let existingId = '';
                           const idAttr = control.getAttributes().find(attr => 
                                attr.getKind() === SyntaxKind.JsxAttribute && 
                                (attr as JsxAttribute).getNameNode().getText() === 'id'
                           ) as JsxAttribute;
                           if (idAttr) {
                               hasId = true;
                               existingId = idAttr.getInitializer()?.getText() || '';
                           }

                           if (!hasId) {
                               control.addAttribute({ name: "id", initializer: idValue });
                               element.addAttribute({ name: "htmlFor", initializer: idValue });
                           } else {
                               element.addAttribute({ name: "htmlFor", initializer: existingId });
                           }
                           changed = true;
                           break;
                       }
                   }
               }
           }
        }
      }
    }
  }

  if (changed) {
    console.log(`Saving changes to ${file.getFilePath()}`);
    file.saveSync();
  }
}
