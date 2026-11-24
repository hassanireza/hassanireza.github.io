import type { Concept, Track } from '../engine/types';

export const TRACKS: Track[] = [
  { id: 'foundations', name: 'Foundations', blurb: 'Output, text, branching and loops.' },
  { id: 'data', name: 'Data', blurb: 'Functions and the built-in data structures.' },
  { id: 'craft', name: 'Craft', blurb: 'Recursion, objects and functional tools.' },
  { id: 'algorithms', name: 'Algorithms', blurb: 'The core toolkit of problem solving.' },
  { id: 'theory', name: 'Game Theory', blurb: 'Strategy, equilibria and mechanisms, in code.' },
];

const c = (id: string, track: Concept['track'], name: string, blurb: string, needs: string[], band: [number, number], habit: string): Concept =>
  ({ id, track, name, blurb, needs, band, habit });

export const CONCEPTS: Concept[] = [
  c('output', 'foundations', 'Output and numbers', 'print, arithmetic, variables.', [], [420, 640], 'Name values. `total = a + b` beats a bare expression.'),
  c('strings', 'foundations', 'Strings', 'Slicing, methods, f-strings.', ['output'], [450, 720], 'Prefer f-strings over concatenation.'),
  c('branching', 'foundations', 'Conditions', 'if, elif, else, booleans.', ['output'], [470, 740], 'Return early instead of nesting deeper.'),
  c('loops', 'foundations', 'Loops and patterns', 'for, while, range, accumulators.', ['branching'], [490, 820], 'Iterate over items, not indexes.'),
  c('functions', 'data', 'Functions', 'def, arguments, return values.', ['loops'], [540, 840], 'One function, one job. Return values, do not print them.'),
  c('lists', 'data', 'Lists and sorting', 'Indexing, slicing, sorted, key functions.', ['loops'], [550, 880], 'Use sorted(key=...) rather than hand-rolled sorts.'),
  c('dicts', 'data', 'Dicts, sets and tuples', 'Lookups, counting, membership.', ['lists'], [600, 960], 'Use dict.get and Counter-style counting.'),
  c('comprehensions', 'data', 'Comprehensions', 'List, dict and set comprehensions, lambda.', ['lists', 'dicts'], [650, 1000], 'If a comprehension needs two lines, write a loop.'),
  c('text', 'data', 'Text processing', 'Words, counting, ciphers, anagrams.', ['strings', 'dicts'], [700, 1050], 'Normalise first (lower, strip), then compare.'),
  c('recursion', 'craft', 'Recursion', 'Base case, recursive case, memoization.', ['functions'], [750, 1200], 'Write the base case first.'),
  c('oop', 'craft', 'Classes and errors', 'Classes, inheritance, exceptions.', ['functions'], [800, 1200], 'Raise specific exceptions with useful messages.'),
  c('functional', 'craft', 'Functional tools', 'Closures, decorators, generators, itertools.', ['functions', 'comprehensions'], [850, 1300], 'Generators keep memory flat on big inputs.'),
  c('numbers', 'algorithms', 'Number theory and bits', 'gcd, primes, sieves, binary.', ['loops'], [800, 1350], 'Reach for math.gcd and divmod before writing your own.'),
  c('arrays', 'algorithms', 'Two pointers and windows', 'Pointers, sliding windows, prefix sums.', ['lists'], [900, 1400], 'Ask whether one pass with two indexes is enough.'),
  c('search', 'algorithms', 'Binary search', 'Halving a sorted range, searching on answers.', ['arrays'], [950, 1450], 'Keep lo and hi invariants explicit. Off-by-one lives here.'),
  c('sorting', 'algorithms', 'Sorting algorithms', 'Merge, quick, counting, custom orders.', ['arrays', 'recursion'], [950, 1500], 'In real code, call sorted(). Write your own to learn the pattern.'),
  c('hashing', 'algorithms', 'Hash map patterns', 'Complements, grouping, frequency tables.', ['dicts'], [900, 1400], 'A dict turns an O(n) scan into an O(1) lookup.'),
  c('stacks', 'algorithms', 'Stacks, queues and heaps', 'LIFO, FIFO, priority queues.', ['lists'], [900, 1450], 'Use collections.deque for queues and heapq for priorities.'),
  c('graphs', 'algorithms', 'Graphs', 'BFS, DFS, shortest paths, ordering.', ['stacks', 'dicts'], [1050, 1700], 'Mark nodes visited when you enqueue them, not when you pop.'),
  c('dp', 'algorithms', 'Dynamic programming', 'States, transitions, tables.', ['recursion'], [1050, 1750], 'Name the state, then write the transition on paper.'),
  c('backtracking', 'algorithms', 'Backtracking', 'Choose, explore, undo.', ['recursion'], [1100, 1750], 'Choose, recurse, undo. Always in that order.'),
  c('greedy', 'algorithms', 'Greedy and intervals', 'Local choices, scheduling, merging.', ['sorting'], [1000, 1600], 'Sort first. Then ask what the best local choice is.'),
  c('gt-matrix', 'theory', 'Payoff matrices', 'Best response, dominance, pure Nash equilibria.', ['lists'], [900, 1400], 'Model a game as data first, then write the rule that reads it.'),
  c('gt-zerosum', 'theory', 'Zero-sum and minimax', 'Saddle points, security levels, mixed value.', ['gt-matrix'], [1000, 1500], 'Maximin is what you can guarantee, whatever the opponent does.'),
  c('gt-nim', 'theory', 'Combinatorial games', 'Nim, XOR, Grundy numbers.', ['numbers'], [1000, 1600], 'Win or lose is a property of the position, so memoize positions.'),
  c('gt-tree', 'theory', 'Game trees and search', 'Minimax, alpha-beta, solving small games.', ['recursion', 'gt-matrix'], [1150, 1800], 'Return a score for the player to move and flip the sign on each ply.'),
  c('gt-repeated', 'theory', 'Repeated games', 'Iterated dilemma, strategies, tournaments.', ['gt-matrix', 'functions'], [1050, 1600], 'A strategy is a function from history to action.'),
  c('gt-mechanism', 'theory', 'Auctions, voting and matching', 'Second price, Borda, Gale-Shapley, Shapley value.', ['dicts', 'sorting'], [1150, 1800], 'Check the rule against strategic behaviour, not only honest inputs.'),
  c('gt-evolution', 'theory', 'Evolutionary games', 'Replicator dynamics, Hawk-Dove, stable strategies.', ['gt-matrix', 'loops'], [1200, 1800], 'Simulate small steps, then check where the population settles.'),
];

export const CONCEPT_BY_ID: Record<string, Concept> = Object.fromEntries(CONCEPTS.map((x) => [x.id, x]));
