import type { RawTopic } from "./types";

/**
 * The two capstones that close the curriculum of the game, Theory Gambit.
 * They mix several theories at once, so they sit after everything else and have their own group.
 */
export const synthesis: RawTopic[] = [
  {
    i: "frames-within-frames",
    n: "Frames Within Frames",
    c: "frames",
    l: 3,
    s: true,
    g: ["synthesis", "hypergame", "beliefs", "levels"],
    d: "Every player sees a different game, so beliefs, hidden types and levels of reasoning all collide in one contest.",
    b: [
      "The earlier chapters take one idea at a time: a game with fixed rules, then what players believe, then what they believe about each other's beliefs. A real contest layers all of these. Each player holds a picture of the game, a guess about the other picture, and a guess about how deeply the other is thinking.",
      "Reading such a contest is a matter of unpacking frames in order. First ask which game each player thinks is being played. Then ask who is mistaken, and whether anyone knows it. Then ask how many steps ahead each player reasons. A move that looks irrational inside one frame is often a best response inside another.",
      "The skill is not a new formula. It is choosing which tool from the library to use at each layer, and noticing when two layers disagree. That is why this entry comes last: it only makes sense once the pieces are familiar.",
    ],
    x: "A poker table is a small version. You hold a hand, you guess the other hand, you guess what the other thinks you hold, and you guess how far ahead they reason. A bluff works when your frame of their frame is right, and fails when they are one level deeper than you assumed.",
    u: "Use it to design deception, hidden roles and unreliable narrators, and to audit a system for the places where two players could hold different pictures of the same rules.",
    o: "A capstone written for this library, not a single result from the literature. It draws on hypergame theory (Bennett, 1977), level-k reasoning and Bayesian games.",
    r: ["hypergame-theory", "hypergame-levels", "level-k", "bayesian-games", "signaling"],
  },
  {
    i: "the-whole-board",
    n: "The Whole Board",
    c: "frames",
    l: 3,
    s: true,
    g: ["synthesis", "dominance", "mixing", "trust", "fairness"],
    d: "Dominance, mixing, trust, fairness and frames all at once, on a single board.",
    b: [
      "The first games each isolate one force. Dominance says some choices are best whatever the others do. Mixing says that when any pattern can be exploited, the stable play is randomness. Trust says that a big shared prize needs belief that the other will also reach for it. Fairness says that people reject offers they find insulting even when refusing costs them.",
      "On a whole board these forces act together. A move can be dominant in one part and risky in another. A fair split can be undone by a rumour about frames. Solving it means checking each force in turn and then asking which one is strongest where you are standing.",
      "This is the last entry because it is the first that has no single answer to memorise. It asks for judgement: which theory applies, where, and what to do when two of them pull in opposite directions.",
    ],
    x: "Imagine a shared project. Working hard is a dominant choice if the reward is individual. It becomes a trust problem if the reward needs everyone. It becomes a fairness problem when the credit is split. And it becomes a frame problem when two people think they are on different projects.",
    u: "Use it as a checklist when balancing a multiplayer system or reading a negotiation: name the dominant moves, the mixed moves, the trust points, the fairness lines and the frames, then see which dominates.",
    o: "A capstone written for this library, not a single result from the literature. It combines dominant strategies, mixed equilibrium, stag hunt trust, ultimatum fairness and hypergame frames.",
    r: ["dominant-strategy", "matching-pennies", "stag-hunt", "ultimatum", "hypergame-levels", "metagame-howard"],
  },
];
