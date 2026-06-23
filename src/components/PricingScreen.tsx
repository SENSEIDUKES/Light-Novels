import React from 'react';
import { motion } from 'motion/react';
import { Shield, Sparkles, Flame, Crown, Eye, Feather } from 'lucide-react';

export const PricingScreen: React.FC = () => {
  const tiers = [
    {
      name: "Mortal",
      price: "Free tier",
      icon: <Eye className="w-8 h-8 text-neutral-400" />,
      color: "from-neutral-700 to-neutral-900",
      borderColor: "border-neutral-700",
      textColor: "text-neutral-300",
      pros: [
        "One Free cover art generation a week",
        "Unlimited Stories Creation",
        "Read All Free Novels",
        "Access Full Internal Reward System",
        "Participation in Community"
      ],
      cons: [
        "Rate Limited Picture Generation (Lose Immersion)",
        "Can't Publish Stories To the Immortal Hub, Scrolls Private Viewing only (Miss The Glory)",
        "Limited Chapter and Story Generation (Lose fun)",
        "Can't Generate Personal Audio Score / Audio Cues (Little white has to sound like the Dragon God Emperor)",
        "Limited Daily Qi Gathering (Others Surpass you “Master would be ashamed”)",
        "Cannot Access Higher Realm God Tools (Clan Head Says You Are Not Ready)"
      ]
    },
    {
      name: "Outer Sect Disciple",
      price: "$5",
      icon: <Feather className="w-8 h-8 text-green-400" />,
      color: "from-green-900/40 to-black",
      borderColor: "border-green-800",
      textColor: "text-green-300",
      pros: [
        "Increased Cover Art + unlocks Codex Art Generations",
        "Increased Chapter and Story Generation Limits",
        "Can Publish Stories To The Immortal Hub",
        "Basic Codex Personalization",
        "Increased Daily Qi Gathering"
      ],
      cons: [
        "Limited On Heavy Picture Generation (Young Master Has Better Robes)",
        "3 Immortal Hub Publishing Slots Weekly (Choose Your Scrolls Wisely)",
        "Still No Personalized Audio Scoring / Audio Cues (The Dragon Sounds Like A Big Lizard)",
        "Limited Advanced Codex Customization (No Phoenix Hairpin Sigils Activated Yet)",
        "Cannot Access Higher Realm God Tools (Master Said You Are Still Not Ready)"
      ]
    },
    {
      name: "Inner Sect Disciple",
      price: "$10",
      icon: <Shield className="w-8 h-8 text-blue-400" />,
      color: "from-blue-900/40 to-black",
      borderColor: "border-blue-800",
      textColor: "text-blue-300",
      pros: [
        "More Cover Art and Codex Image Generation Attempts",
        "More Chapter And Story Generation",
        "Unlimited Immortal Hub, Publishing Slots",
        "Personal Audio Scoring and Cues Unlocked",
        "Daily Qi limits raised, and Reward Progression fully unlocked.",
        "Unlock Full Codex Customization Options"
      ],
      cons: [
        "Still Not Unlimited Visual Generation (Heaven Still Charges Spirit Stones)",
        "Premium Audio Cues Still Limited (Ran out Before the Immortal God Tournament)",
        "Limited Deep Codex Customization (You Can See The Gate, But Not Enter Fully)",
        "Cannot Access Sect Master Realm Priority (Elders Still Walk In Front Of You)",
        "Still Cannot Access Higher Realm God Tools (The Gods still don't Approve)"
      ]
    },
    {
      name: "Sect Master",
      price: "$20",
      icon: <Crown className="w-8 h-8 text-amber-400" />,
      color: "from-amber-900/40 to-black",
      borderColor: "border-amber-600",
      textColor: "text-amber-300",
      pros: [
        "Higher Cover Art and Codex Image Generation Limits",
        "Unlimited Chapter And Story Generation",
        "Unlimited Immortal Hub, Publishing Slots + Sect Master Perks unlocked (Custom Author Name colors, Sect Master Display Badges)",
        "More Personal Audio Scoring and Cue Generation Unlocked",
        "20% Boost to Daily Qi Gathering , and Reward Progression",
        "Fully Unlocks Destiny Forking as an option to All public Stories"
      ],
      cons: [
        "Still Has Fair Use Limits During Heavy System Load (Even Immortals Respect Server Bills)",
        "Experimental Author Tools Not Included (That Path Belongs To The Immortals)"
      ]
    },
    {
      name: "Immortal Wanderer",
      price: "$50",
      icon: <Flame className="w-8 h-8 text-purple-400" />,
      color: "from-purple-900/40 to-black",
      borderColor: "border-purple-500",
      textColor: "text-purple-300",
      pros: [
        "Experimental Author-Based Tier (For Creators Building Real Worlds, Not Just Reading Scrolls)",
        "Everything In Sect Master Included (You Do Not Lose The Realm You Already Conquered)",
        "Immortal Badge / Author Prestige Mark (Readers Know You Are Cooking With Forbidden Ink)",
        "Early Access To Experimental Writing, Codex, Audio, and Hub Tools (Heavenly Beta Access)",
        "Expanded Author Workspace For Managing Multiple Story Worlds (One Mind, Ten Thousand Scrolls)",
        "Deeper Lore / Codex / World Bible Support (Your World Stops Forgetting Its Own Dao)",
        "Extra Publishing, Testing, and Feedback Features For Serious Authors (The Sect Reviews Your Scripture)",
        "Revenue / Contribution / Featured Creator Experiments Later (Not Promised, But The Door Exists)"
      ],
      cons: [
        "Experimental Tier Subject To Change (The Heavenly Dao Is Still Being Written)",
        "Not Required To Enjoy The App (No Mortal Should Feel Robbed Of The Fun)",
        "Does Not Make Sect Master Worse (Sect Master Remains The Main Premium Realm)",
        "Best For Authors, Power Users, And Supporters (Casual Readers May Be Overcultivating)",
        "Some Scholar Tools May Be Rough, Limited, Or Invite-Based At First (Forbidden Techniques Can Explode)",
        "Value Depends On How Much You Create (If You Don't Write, The Brush Gathers Dust)"
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto font-serif">
      <div className="text-center mb-16 relative">
        {/* Mystical background elements */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[200px] bg-gradient-to-r from-transparent via-cyan-900/20 to-transparent blur-3xl rounded-[100%]" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 inline-block"
        >
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="h-[1px] w-16 md:w-32 bg-gradient-to-r from-transparent to-cyan-400" />
            <Sparkles className="text-cyan-400 w-6 h-6 animate-pulse" />
            <div className="h-[1px] w-16 md:w-32 bg-gradient-to-l from-transparent to-cyan-400" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-500 tracking-wider mb-6 drop-shadow-[0_0_20px_rgba(4,172,255,0.6)] uppercase">
            Guild Notice Board
          </h1>
          
          <div className="relative inline-block border-y border-cyan-800/50 py-4 px-8 bg-black/40 backdrop-blur-sm">
            <p className="text-xl md:text-2xl text-cyan-200/90 max-w-3xl mx-auto italic font-serif leading-relaxed">
              "Offer your Spirit Stones to the Heavens. Choose your path of cultivation, from lowly Mortal to Immortal Wanderer."
            </p>
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {tiers.map((tier, idx) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.5 }}
            className={`relative p-[1px] rounded-2xl bg-gradient-to-b ${tier.color} overflow-hidden group ${idx === 4 ? 'md:col-span-2 lg:col-span-3' : ''}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-b ${tier.color} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className={`relative h-full bg-[#0a0a0a]/90 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border-t ${tier.borderColor} flex flex-col`}>
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-2xl font-bold font-display ${tier.textColor} drop-shadow-[0_0_10px_currentColor]`}>{tier.name}</h3>
                  <div className="text-3xl font-mono mt-2 tracking-widest text-neutral-200">{tier.price}</div>
                </div>
                <div className={`p-3 rounded-xl bg-white/5 border ${tier.borderColor} shadow-[0_0_15px_currentColor] text-[${tier.textColor}]`}>
                  {tier.icon}
                </div>
              </div>

              <div className="space-y-6 flex-grow">
                <div>
                  <h4 className="text-sm uppercase tracking-widest font-bold text-green-400 mb-3 flex items-center">
                    <span className="w-4 h-px bg-green-400 mr-2" /> Heavenly Blessings
                  </h4>
                  <ul className="space-y-2">
                    {tier.pros.map((pro, i) => (
                      <li key={i} className="flex items-start text-sm text-neutral-300">
                        <span className="text-green-500 mr-2 mt-0.5">✦</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm uppercase tracking-widest font-bold text-red-400/80 mb-3 flex items-center">
                    <span className="w-4 h-px bg-red-400/80 mr-2" /> Heavenly Tribulations
                  </h4>
                  <ul className="space-y-2">
                    {tier.cons.map((con, i) => (
                      <li key={i} className="flex items-start text-sm text-neutral-400 italic">
                        <span className="text-red-500/70 mr-2 mt-0.5">✧</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button className={`mt-8 w-full py-3 rounded-lg border ${tier.borderColor} ${tier.textColor} hover:bg-white/5 transition-colors duration-300 font-bold tracking-widest uppercase text-sm`}>
                Offer Spirit Stones
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
