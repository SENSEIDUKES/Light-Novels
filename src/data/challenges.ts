import { FateSurvivalChallenge } from '../types';

export const PRESET_CHALLENGES: FateSurvivalChallenge[] = [
  {
    id: 'wedding-never-happens',
    title: 'The Wedding That Never Happens',
    genre: 'Romance / Fate Survival',
    description: 'Two lovers are destined to separate before their wedding. Can you guide them to shatter this fated division, or will the red strings of destiny unravel completely?',
    fatedOutcome: 'They separate before the wedding, never seeing each other again.',
    startingScenario: 'The wedding is in seven days. The wedding hall is half-decorated, but an inexplicable cold tension is already building between you and your partner. Words are left unspoken, and shadows hover over your joint future.',
    totalSteps: 5,
    successCondition: 'Shatter the fated divorce and stand united at the altar. (Fate Resistance >= 6 and Danger <= 4)',
    failureCondition: 'Lose each other to the relentless flow of fated separation. (Danger > 7 or Fate Resistance < 3)',
    rewards: {
      attemptQi: 5,
      failureQi: 10,
      partialSuccessQi: 25,
      successQi: 50
    },
    choicePoints: [
      {
        id: 'wedding-cp1',
        stepNumber: 1,
        prompt: 'Your partner seems incredibly distant during the lantern decoration tonight, staring at the horizon with sad eyes. What do you do?',
        choices: [
          {
            id: 'wedding-cp1-c1',
            label: 'Confront them directly.',
            description: 'Demand to know why they are retreating on the eve of your sacred union.',
            effects: { relationship: 1, trust: -1, danger: 1 }
          },
          {
            id: 'wedding-cp1-c2',
            label: 'Give them quiet space.',
            description: 'Gently hold their hand but ask no questions, respecting their internal storm.',
            effects: { trust: 1, fateResistance: 1 }
          },
          {
            id: 'wedding-cp1-c3',
            label: 'Consult a mutual friend.',
            description: 'Seek external guidance from someone who knows their heart.',
            effects: { relationship: 1, danger: 1 }
          },
          {
            id: 'wedding-cp1-c4',
            label: 'Ignore the distant mood.',
            description: 'Assume it is simple pre-wedding anxiety and carry on singing.',
            effects: { danger: 2 }
          }
        ]
      },
      {
        id: 'wedding-cp2',
        stepNumber: 2,
        prompt: 'A rare imperial decree arrives: a massive career opportunity in the capital city, thousands of miles away, but only one of you can go.',
        choices: [
          {
            id: 'wedding-cp2-c1',
            label: 'Encourage them to go.',
            description: 'Put their dreams before your relationship, even if it creates physical distance.',
            effects: { trust: 2, relationship: -1, danger: 1 }
          },
          {
            id: 'wedding-cp2-c2',
            label: 'Ask them to stay.',
            description: 'Plead with them to prioritize the wedding and stay by your side.',
            effects: { relationship: 1, trust: -1, danger: 1 }
          },
          {
            id: 'wedding-cp2-c3',
            label: 'Find a creative compromise.',
            description: 'Suggest looking for local posts or delayed appointments, seeking a middle way.',
            effects: { relationship: 1, trust: 1, fateResistance: 1 }
          },
          {
            id: 'wedding-cp2-c4',
            label: 'Say absolutely nothing.',
            description: 'Let the pressure build in suffocating silence, leaving the letter unanswered.',
            effects: { danger: 2 }
          }
        ]
      },
      {
        id: 'wedding-cp3',
        stepNumber: 3,
        prompt: 'A poisonous misunderstanding is revealed: a letter from your former sect-mate suggests you only married for political protection.',
        choices: [
          {
            id: 'wedding-cp3-c1',
            label: 'Demand the truth.',
            description: 'Sit them down and demand they verify the rumors with absolute clarity.',
            effects: { trust: 1, fateResistance: 1, danger: 1 }
          },
          {
            id: 'wedding-cp3-c2',
            label: 'Defend your partner.',
            description: 'Refuse to believe the letter and stand by their honor in front of the elders.',
            effects: { relationship: 2, trust: 1 }
          },
          {
            id: 'wedding-cp3-c3',
            label: 'Believe the rival’s claim.',
            description: 'Fall into despair and question if your whole romance was a hollow sham.',
            effects: { danger: 3, relationship: -2 }
          },
          {
            id: 'wedding-cp3-c4',
            label: 'Investigate quietly.',
            description: 'Trace the origin of the forgery without alerting your partner, seeking hidden shadows.',
            effects: { fateResistance: 2, trust: -1 }
          }
        ]
      },
      {
        id: 'wedding-cp4',
        stepNumber: 4,
        prompt: 'With only two days left, a massive storm sweeps through, destroying the wedding pavilion and threatening the surrounding village.',
        choices: [
          {
            id: 'wedding-cp4-c1',
            label: 'Brave the storm to save the village together.',
            description: 'Stand side-by-side in the torrential rains, sealing your bond through shared peril.',
            effects: { fateResistance: 2, danger: -1, trust: 1 }
          },
          {
            id: 'wedding-cp4-c2',
            label: 'Save the ceremonial items alone.',
            description: 'Scurry into the collapsing pavilion to rescue the bridal silk, ignoring the cold rain.',
            effects: { trust: 1, relationship: -1, danger: 1 }
          },
          {
            id: 'wedding-cp4-c3',
            label: 'Abandon the wedding preparations.',
            description: 'Flee to higher ground, muttering that the heavens clearly oppose this wedding.',
            effects: { danger: 2, fateResistance: -1 }
          },
          {
            id: 'wedding-cp4-c4',
            label: 'Hold each other and wait it out.',
            description: 'Seek shelter in the basement, taking comfort only in each other’s warmth.',
            effects: { relationship: 2, trust: 1 }
          }
        ]
      }
    ]
  },
  {
    id: 'sect-last-stand',
    title: 'The Last Stand of the Lotus Sect',
    genre: 'Cultivation / Wuxia Survival',
    description: 'The ancient Lotus Sect is surrounded by demon lords. History records its absolute annihilation. Can you withstand the onslaught and secure a seed of survival?',
    fatedOutcome: 'The sect is burnt to ashes; all disciples perish in the flame.',
    startingScenario: 'The sky is colored deep crimson. Three demon grandmasters have erected a soul-refining barrier around the Lotus Peaks. The sect leader is heavily injured, and panic spreads like wildfire among the outer disciples.',
    totalSteps: 5,
    successCondition: 'Repel the demons and keep the lotus flame alive. (Fate Resistance >= 6 and Danger <= 4)',
    failureCondition: 'Total annihilation under the demonic mountain-splitting hammer. (Danger > 7 or Fate Resistance < 3)',
    rewards: {
      attemptQi: 5,
      failureQi: 10,
      partialSuccessQi: 25,
      successQi: 50
    },
    choicePoints: [
      {
        id: 'sect-cp1',
        stepNumber: 1,
        prompt: 'The demonic vanguard attacks the northern gate. The defensive array is flickering. Where do you direct your squad?',
        choices: [
          {
            id: 'sect-cp1-c1',
            label: 'Pour all your Qi into the array.',
            description: 'Exhaust your energy to bolster the ward, keeping the demons at bay.',
            effects: { fateResistance: 1, trust: 1 }
          },
          {
            id: 'sect-cp1-c2',
            label: 'Charge out for a pre-emptive strike.',
            description: 'Lead a desperate counter-charge to slay the vanguard commander.',
            effects: { relationship: 1, danger: 2 }
          },
          {
            id: 'sect-cp1-c3',
            label: 'Fall back and fortify the inner sanctum.',
            description: 'Conserve forces and abandon the outer wall to the demonic horde.',
            effects: { danger: 1, trust: -1, fateResistance: 1 }
          },
          {
            id: 'sect-cp1-c4',
            label: 'Do nothing, paralyzed by fear.',
            description: 'Allow chaos to consume the ranks as outer disciples flee in terror.',
            effects: { danger: 3 }
          }
        ]
      },
      {
        id: 'sect-cp2',
        stepNumber: 2,
        prompt: 'A critically injured elder begs you to escape with the Sect’s Ancestral Scripture, but doing so means abandoning the wounded disciples.',
        choices: [
          {
            id: 'sect-cp2-c1',
            label: 'Take the scripture and run.',
            description: 'Preserve the legacy above all else, abandoning the front lines.',
            effects: { fateResistance: 2, trust: -2, danger: -1 }
          },
          {
            id: 'sect-cp2-c2',
            label: 'Refuse to leave the disciples.',
            description: 'Burn the scripture so it never falls into demonic hands, and stand with your kin.',
            effects: { trust: 2, relationship: 1, danger: 1 }
          },
          {
            id: 'sect-cp2-c3',
            label: 'Hide the scripture in the sacred pond.',
            description: 'Entrust the legacy to the earth, planning to retrieve it if you survive.',
            effects: { fateResistance: 1, trust: 1, danger: 1 }
          },
          {
            id: 'sect-cp2-c4',
            label: 'Argue with the elder.',
            description: 'Waste precious seconds debating ethics while demons scale the inner wall.',
            effects: { danger: 2 }
          }
        ]
      },
      {
        id: 'sect-cp3',
        stepNumber: 3,
        prompt: 'The Demon Lord offers a pact: surrender the Sect Leader’s head, and the rest of you will be spared to walk as servants.',
        choices: [
          {
            id: 'sect-cp3-c1',
            label: 'Spit on the demon’s offer.',
            description: 'Unite the disciples in defiant laughter, raising your swords high.',
            effects: { trust: 2, fateResistance: 2, danger: 1 }
          },
          {
            id: 'sect-cp3-c2',
            label: 'Pretend to negotiate to buy time.',
            description: 'Feign surrender while your allies prepare a massive secret counter-strike.',
            effects: { relationship: 1, trust: -1, fateResistance: 1 }
          },
          {
            id: 'sect-cp3-c3',
            label: 'Sow seeds of rebellion.',
            description: 'Whisper to others that maybe surrender is the only rational path left.',
            effects: { danger: 3, relationship: -2 }
          },
          {
            id: 'sect-cp3-c4',
            label: 'Activate the forbidden sacrifice seal.',
            description: 'Ignite your own life-force to power the ancient temple defensive beam.',
            effects: { fateResistance: 3, danger: -1, trust: 1 }
          }
        ]
      },
      {
        id: 'sect-cp4',
        stepNumber: 4,
        prompt: 'The demon array collapses into a chaotic vortex. A blazing demon commander targets your closest companion.',
        choices: [
          {
            id: 'sect-cp4-c1',
            label: 'Throw yourself in front of the blow.',
            description: 'Take the lethal curse meant for your friend, trusting your cultivation to survive.',
            effects: { relationship: 3, trust: 2, danger: -1 }
          },
          {
            id: 'sect-cp4-c2',
            label: 'Strike the commander’s weak spot.',
            description: 'Focus entirely on offence, ignoring the danger to your companion.',
            effects: { danger: 2, fateResistance: 1 }
          },
          {
            id: 'sect-cp4-c3',
            label: 'Retreat to the backup portal.',
            description: 'Ensure your own escape path remains clear as the cavern crumbles.',
            effects: { danger: -1, trust: -1, fateResistance: 1 }
          },
          {
            id: 'sect-cp4-c4',
            label: 'Cry out in panic.',
            description: 'Freeze in horror as the demonic fire engulfs the central courtyard.',
            effects: { danger: 2, relationship: -1 }
          }
        ]
      }
    ]
  },
  {
    id: 'sects-ruin',
    title: 'The Sect’s Ruin',
    genre: 'Betrayal / Poverty Fate',
    description: 'The MC is a low-ranking disciple in a prestigious martial arts sect. The hidden Fate is that the Sect Leader’s trusted advisor is corrupted and destined to slaughter the elders, burn the sect to the ground, and steal a forbidden manual.',
    fatedOutcome: 'The advisor launches a coup, kills the elders, destroys the sect, and escapes with the forbidden manual.',
    startingScenario: 'You are sweeping the outer courtyard at midnight. You overhear a whispered conversation between the trusted advisor and a masked figure, mentioning the timing of the elder\'s vulnerability and the location of the forbidden manual.',
    totalSteps: 5,
    successCondition: 'Expose the advisor before the coup fully unfolds. The elders survive, the forbidden manual is protected, and the sect avoids total destruction. (Fate Resistance >= 6 and Trust >= 5)',
    failureCondition: 'The coup happens. The sect is burned, the elders die, and the MC barely escapes alive. (Danger > 7 or Trust < 3)',
    rewards: {
      attemptQi: 5,
      failureQi: 10,
      partialSuccessQi: 25,
      successQi: 50
    },
    choicePoints: [
      {
        id: 'sects-ruin-cp1',
        stepNumber: 1,
        prompt: 'You have only pieces of the puzzle. Who do you approach first?',
        choices: [
          {
            id: 'sects-ruin-cp1-c1',
            label: 'Go directly to the Sect Leader.',
            description: 'Demand an audience and accuse the advisor directly.',
            effects: { danger: 2, trust: -1, fateResistance: 1 }
          },
          {
            id: 'sects-ruin-cp1-c2',
            label: 'Confide in a fellow low-ranking disciple.',
            description: 'Seek an ally to help gather more evidence.',
            effects: { relationship: 2, danger: -1, trust: 1 }
          },
          {
            id: 'sects-ruin-cp1-c3',
            label: 'Investigate the advisor\'s quarters secretly.',
            description: 'Risk everything to find hard evidence of the betrayal.',
            effects: { danger: 2, fateResistance: 2 }
          },
          {
            id: 'sects-ruin-cp1-c4',
            label: 'Wait for more information.',
            description: 'Keep your head down and hope you misheard.',
            effects: { danger: 3 }
          }
        ]
      },
      {
        id: 'sects-ruin-cp2',
        stepNumber: 2,
        prompt: 'The advisor announces a sudden change in the guard rotation, leaving the forbidden archives vulnerable tonight.',
        choices: [
          {
            id: 'sects-ruin-cp2-c1',
            label: 'Volunteer for the archives guard duty.',
            description: 'Place yourself directly in the line of fire.',
            effects: { danger: 2, fateResistance: 2, trust: 1 }
          },
          {
            id: 'sects-ruin-cp2-c2',
            label: 'Warn the current archive guards.',
            description: 'Try to alert them without revealing your suspicions of the advisor.',
            effects: { trust: 1, relationship: 1 }
          },
          {
            id: 'sects-ruin-cp2-c3',
            label: 'Create a distraction elsewhere.',
            description: 'Start a fire in the outer courtyards to disrupt the timeline.',
            effects: { danger: 1, fateResistance: 1 }
          },
          {
            id: 'sects-ruin-cp2-c4',
            label: 'Use the opportunity to steal the manual yourself.',
            description: 'Take the manual to keep it safe, risking being branded a thief.',
            effects: { danger: 3, trust: -2, fateResistance: 2 }
          }
        ]
      },
      {
        id: 'sects-ruin-cp3',
        stepNumber: 3,
        prompt: 'You find a coded message dropped by the masked figure. It reveals the attack is happening during the upcoming elder meditation retreat.',
        choices: [
          {
            id: 'sects-ruin-cp3-c1',
            label: 'Take the message to the strictest elder.',
            description: 'Hope their rigid adherence to the rules will force an investigation.',
            effects: { trust: 2, fateResistance: 1, danger: 1 }
          },
          {
            id: 'sects-ruin-cp3-c2',
            label: 'Try to decode it fully yourself.',
            description: 'Spend precious time unlocking the exact details of the coup.',
            effects: { fateResistance: 2, danger: 1 }
          },
          {
            id: 'sects-ruin-cp3-c3',
            label: 'Plant the message on a rival faction member.',
            description: 'Create chaos and let the elders find it "accidentally".',
            effects: { trust: -1, relationship: -1, fateResistance: 1 }
          },
          {
            id: 'sects-ruin-cp3-c4',
            label: 'Destroy the message.',
            description: 'Fear that being caught with it will make you the scapegoat.',
            effects: { danger: 2, trust: -1 }
          }
        ]
      },
      {
        id: 'sects-ruin-cp4',
        stepNumber: 4,
        prompt: 'The retreat begins. The advisor makes their move, drawing a poisoned blade towards the meditating Sect Leader.',
        choices: [
          {
            id: 'sects-ruin-cp4-c1',
            label: 'Leap in front of the blade.',
            description: 'Sacrifice yourself to save the Sect Leader.',
            effects: { survival: -3, trust: 3, fateResistance: 3, relationship: 2 }
          },
          {
            id: 'sects-ruin-cp4-c2',
            label: 'Throw a weapon to disarm the advisor.',
            description: 'Use your skills to intervene from a distance.',
            effects: { danger: 1, fateResistance: 2, trust: 1 }
          },
          {
            id: 'sects-ruin-cp4-c3',
            label: 'Scream a warning.',
            description: 'Alert the elders, though it might be too late to stop the first strike.',
            effects: { danger: -1, trust: 1, fateResistance: 1 }
          },
          {
            id: 'sects-ruin-cp4-c4',
            label: 'Flee to the archives to secure the manual.',
            description: 'Abandon the leader to ensure the sect\'s knowledge survives.',
            effects: { survival: 2, trust: -3, fateResistance: 1, danger: -1 }
          }
        ]
      }
    ]
  },
  {
    id: 'capitals-collapse',
    title: 'The Capital’s Collapse',
    genre: 'Kingdom Fate',
    description: 'The kingdom’s capital city is built over a dormant magical anomaly. The hidden Fate is that the anomaly will erupt, swallow the capital into a dimensional rift, and shatter the continent’s political structure.',
    fatedOutcome: 'The anomaly erupts beneath the capital, consuming the city and breaking the kingdom’s power center.',
    startingScenario: 'Minor earthquakes have been shaking the capital. As a junior magical researcher, you notice the city\'s mana grid is fluctuating wildly, syncing with a deep, rhythmic pulse from below.',
    totalSteps: 5,
    successCondition: 'Gather the necessary artifacts, uncover the truth behind the anomaly, and sacrifice your magical core to stabilize it. (Fate Resistance >= 6 and Survival > 2)',
    failureCondition: 'The anomaly erupts. The capital is swallowed into a dimensional rift. (Danger > 7 or Fate Resistance < 3)',
    rewards: {
      attemptQi: 5,
      failureQi: 10,
      partialSuccessQi: 25,
      successQi: 50
    },
    choicePoints: [
      {
        id: 'capitals-collapse-cp1',
        stepNumber: 1,
        prompt: 'The Chief Mage dismisses your findings as faulty equipment. The tremors are getting worse.',
        choices: [
          {
            id: 'capitals-collapse-cp1-c1',
            label: 'Steal the restricted stabilization blueprints.',
            description: 'Break into the restricted section to find a solution yourself.',
            effects: { danger: 2, fateResistance: 2, trust: -1 }
          },
          {
            id: 'capitals-collapse-cp1-c2',
            label: 'Publish your findings to the public.',
            description: 'Cause a panic but force the authorities to act.',
            effects: { danger: 3, trust: -2, fateResistance: 1 }
          },
          {
            id: 'capitals-collapse-cp1-c3',
            label: 'Seek out the disgraced former archmage.',
            description: 'Find the one person who might believe you, though they are an exile.',
            effects: { relationship: 2, fateResistance: 1 }
          },
          {
            id: 'capitals-collapse-cp1-c4',
            label: 'Recalibrate your instruments.',
            description: 'Waste time doubting yourself while the pressure builds.',
            effects: { danger: 2 }
          }
        ]
      },
      {
        id: 'capitals-collapse-cp2',
        stepNumber: 2,
        prompt: 'You discover that stabilizing the anomaly requires three ancient artifacts scattered across the city, currently held by powerful nobles.',
        choices: [
          {
            id: 'capitals-collapse-cp2-c1',
            label: 'Organize a heist.',
            description: 'Gather a crew and steal the artifacts.',
            effects: { danger: 2, relationship: 2, fateResistance: 2 }
          },
          {
            id: 'capitals-collapse-cp2-c2',
            label: 'Plead with the nobles.',
            description: 'Try to convince them of the impending doom.',
            effects: { trust: 1, danger: 1 }
          },
          {
            id: 'capitals-collapse-cp2-c3',
            label: 'Forge replicas to swap with the originals.',
            description: 'Use your magical expertise to trick them.',
            effects: { fateResistance: 1, danger: 1 }
          },
          {
            id: 'capitals-collapse-cp2-c4',
            label: 'Try to stabilize it without the artifacts.',
            description: 'Attempt a dangerous alternative ritual.',
            effects: { danger: 3, survival: -1 }
          }
        ]
      },
      {
        id: 'capitals-collapse-cp3',
        stepNumber: 3,
        prompt: 'As you secure the final artifact, the royal guard corners you, demanding you hand it over for "safekeeping".',
        choices: [
          {
            id: 'capitals-collapse-cp3-c1',
            label: 'Fight your way out.',
            description: 'Use destructive magic to escape, damaging the city in the process.',
            effects: { survival: -1, danger: 2, fateResistance: 1 }
          },
          {
            id: 'capitals-collapse-cp3-c2',
            label: 'Surrender the artifact.',
            description: 'Hand it over and hope you can steal it back later.',
            effects: { trust: 1, danger: 2, fateResistance: -1 }
          },
          {
            id: 'capitals-collapse-cp3-c3',
            label: 'Use an experimental teleportation spell.',
            description: 'Risk tearing your own magical circuits to jump to the anomaly core.',
            effects: { survival: -2, fateResistance: 2, danger: -1 }
          },
          {
            id: 'capitals-collapse-cp3-c4',
            label: 'Bluff them with a fake.',
            description: 'Hand over a decoy and run.',
            effects: { danger: 1, fateResistance: 1 }
          }
        ]
      },
      {
        id: 'capitals-collapse-cp4',
        stepNumber: 4,
        prompt: 'You reach the anomaly core. The artifacts are in place, but the energy output is too massive. It needs a living magical core as a catalyst to permanently seal it.',
        choices: [
          {
            id: 'capitals-collapse-cp4-c1',
            label: 'Sacrifice your own magical core.',
            description: 'Give up your magic forever to save the city.',
            effects: { survival: -2, fateResistance: 4, trust: 3 }
          },
          {
            id: 'capitals-collapse-cp4-c2',
            label: 'Try to siphon the energy elsewhere.',
            description: 'Attempt to redirect the blast, saving your magic but risking the capital.',
            effects: { danger: 3, fateResistance: -1 }
          },
          {
            id: 'capitals-collapse-cp4-c3',
            label: 'Force an artifact to act as the core.',
            description: 'Overload one of the ancient relics, creating an unstable but temporary fix.',
            effects: { danger: 2, fateResistance: 2 }
          },
          {
            id: 'capitals-collapse-cp4-c4',
            label: 'Flee the core.',
            description: 'Accept that the city is lost and save yourself.',
            effects: { survival: 3, danger: 4, fateResistance: -3 }
          }
        ]
      }
    ]
  },
  {
    id: 'temporal-echo',
    title: 'The Temporal Echo',
    genre: 'Love Fate / Separation Fate',
    description: 'Two characters are deeply connected, but the world is actively trying to keep them apart in a cyberpunk city. Every system pushes them toward separation.',
    fatedOutcome: 'The extraction fails. One lover is captured, and the other is forced to flee the city alone.',
    startingScenario: 'You are on opposite sides of a corporate war. Tonight is the extraction window. You have 30 minutes to meet at the rendezvous point before the sector goes into full lockdown.',
    totalSteps: 5,
    successCondition: 'Orchestrate a complex heist that gets both characters into the same room long enough for them to escape together. (Fate Resistance >= 6 and Relationship >= 6)',
    failureCondition: 'The extraction fails. One character is captured, and the other is forced to flee. (Danger > 7 or Relationship < 3)',
    rewards: {
      attemptQi: 5,
      failureQi: 10,
      partialSuccessQi: 25,
      successQi: 50
    },
    choicePoints: [
      {
        id: 'temporal-echo-cp1',
        stepNumber: 1,
        prompt: 'Your comms are jammed. You can\'t confirm if your partner made it out of their corporate tower. The extraction transport arrives in 20 minutes.',
        choices: [
          {
            id: 'temporal-echo-cp1-c1',
            label: 'Break into the corporate tower.',
            description: 'Risk everything to ensure they get out.',
            effects: { danger: 3, relationship: 2, fateResistance: 1 }
          },
          {
            id: 'temporal-echo-cp1-c2',
            label: 'Head to the rendezvous point and wait.',
            description: 'Trust that they will make it.',
            effects: { trust: 2, danger: -1 }
          },
          {
            id: 'temporal-echo-cp1-c3',
            label: 'Hire a netrunner to slice the comms.',
            description: 'Burn valuable credits to re-establish the connection.',
            effects: { fateResistance: 1, danger: 1 }
          },
          {
            id: 'temporal-echo-cp1-c4',
            label: 'Leave early without them.',
            description: 'Assume they are dead or captured and save yourself.',
            effects: { relationship: -4, survival: 2, danger: -2 }
          }
        ]
      },
      {
        id: 'temporal-echo-cp2',
        stepNumber: 2,
        prompt: 'You spot your partner across the plaza, but a squad of corporate enforcers is closing in on them. They haven\'t seen the enforcers yet.',
        choices: [
          {
            id: 'temporal-echo-cp2-c1',
            label: 'Open fire on the enforcers.',
            description: 'Draw their attention to yourself, giving your partner a chance to run.',
            effects: { survival: -2, danger: 2, relationship: 2, fateResistance: 1 }
          },
          {
            id: 'temporal-echo-cp2-c2',
            label: 'Signal them silently.',
            description: 'Try to guide them away using coded hand signals.',
            effects: { trust: 1, fateResistance: 1 }
          },
          {
            id: 'temporal-echo-cp2-c3',
            label: 'Hack the plaza\'s lighting system.',
            description: 'Plunge the area into darkness to create confusion.',
            effects: { fateResistance: 2, danger: -1 }
          },
          {
            id: 'temporal-echo-cp2-c4',
            label: 'Wait and see if they notice the enforcers.',
            description: 'Don\'t blow your own cover until absolutely necessary.',
            effects: { danger: 2, trust: -1 }
          }
        ]
      },
      {
        id: 'temporal-echo-cp3',
        stepNumber: 3,
        prompt: 'You both make it to the extraction point, but the transport pilot demands double the payment or he leaves without you.',
        choices: [
          {
            id: 'temporal-echo-cp3-c1',
            label: 'Threaten the pilot.',
            description: 'Draw your weapon and force him to fly.',
            effects: { danger: 2, trust: -1, fateResistance: 1 }
          },
          {
            id: 'temporal-echo-cp3-c2',
            label: 'Give him your most valuable corporate data drive.',
            description: 'Trade your only leverage against your former employers for a ticket out.',
            effects: { survival: -1, fateResistance: 2, relationship: 1 }
          },
          {
            id: 'temporal-echo-cp3-c3',
            label: 'One of you stays behind to hold off the incoming guards.',
            description: 'Ensure at least one person escapes.',
            effects: { relationship: -3, survival: 2, fateResistance: -2 }
          },
          {
            id: 'temporal-echo-cp3-c4',
            label: 'Try to hotwire the transport while he argues.',
            description: 'Steal the ship from right under his nose.',
            effects: { danger: 2, fateResistance: 1 }
          }
        ]
      },
      {
        id: 'temporal-echo-cp4',
        stepNumber: 4,
        prompt: 'The transport takes off, but a corporate drone locks onto your engines. A missile is incoming.',
        choices: [
          {
            id: 'temporal-echo-cp4-c1',
            label: 'Perform an evasive maneuver.',
            description: 'Take manual control and risk crashing the ship to dodge the missile.',
            effects: { danger: 2, fateResistance: 1, survival: -1 }
          },
          {
            id: 'temporal-echo-cp4-c2',
            label: 'Eject the engine core as a decoy.',
            description: 'Blow the core, leaving you adrift but alive.',
            effects: { survival: 1, danger: -1, fateResistance: 2 }
          },
          {
            id: 'temporal-echo-cp4-c3',
            label: 'Hold each other and brace for impact.',
            description: 'Accept whatever fate comes, together.',
            effects: { relationship: 3, survival: -2, fateResistance: -1 }
          },
          {
            id: 'temporal-echo-cp4-c4',
            label: 'Attempt to hack the missile\'s targeting system mid-flight.',
            description: 'A desperate, highly improbable digital defense.',
            effects: { danger: 2, fateResistance: 3 }
          }
        ]
      }
    ]
  }
];
