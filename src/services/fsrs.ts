// Default parameters for FSRS-5
const w = [0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567];

const FACTOR = 0.9;
const DECAY = -0.5;

export interface FSRSInput {
    difficulty: number;
    stability: number;
    reps: number;
    lapses: number;
    lastInterval: number;
    timeSinceLastReview: number;
    grade: number; // 1: Again, 3: Good
}

export interface FSRSOutput {
    difficulty: number;
    stability: number;
    retrievability: number;
    reps: number;
    lapses: number;
    interval: number;
    next_review?: string;
    review_date?: string;
}

export function initializeCard(): FSRSOutput {
    return {
        difficulty: w[4], // Initial difficulty when first rating is 'again'
        stability: 0,
        retrievability: 0,
        reps: 0,
        lapses: 0,
        interval: 0
    };
}

export function calculateFSRS(input: FSRSInput): FSRSOutput {
    const { difficulty, stability, reps, lapses, lastInterval, timeSinceLastReview, grade } = input;

    // Calculate retrievability
    const retrievability = stability === 0 ? 0 : Math.pow(1 + FACTOR * timeSinceLastReview / Math.max(stability, 1), DECAY);

    // Update difficulty
    let newDifficulty: number;
    if (reps === 0) {
        newDifficulty = w[4] - Math.exp(w[5] * (grade - 1)) + 1;
    } else {
        const difficultyDelta = w[6] * (1 / retrievability - 1) * (grade - 3);
        newDifficulty = difficulty + difficultyDelta;
        // Apply mean reversion
        const initialDifficulty = w[4] - Math.exp(w[5] * (4 - 1)) + 1; // D_0(4)
        newDifficulty = w[7] * initialDifficulty + (1 - w[7]) * newDifficulty;
    }
    newDifficulty = Math.min(Math.max(newDifficulty, 1), 10);

    // Calculate new stability
    let newStability: number;
    if (grade === 3) { // Good
        if (reps === 0) {
            // For short-term memory
            newStability = Math.max(stability, 0.1) * Math.exp(w[17] * (grade - 3 + w[18]));
        } else {
            const stabilityFactor = 1 + Math.exp(w[8]) * (11 - newDifficulty) * Math.pow(Math.max(stability, 0.1), -w[9]) * (Math.exp((1 - retrievability) * w[10]) - 1);
            newStability = stability * stabilityFactor;
        }
    } else { // Again
        newStability = w[0] + w[1] * (newDifficulty / 10) * Math.pow(stability + 1, w[2]);
    }

    // Ensure stability is never negative
    newStability = Math.max(newStability, 0);

    // Calculate new interval
    const requestRetention = 0.9;
    let newInterval = Math.round((newStability / FACTOR) * (Math.pow(requestRetention, 1 / DECAY) - 1));

    // Apply some constraints to the new interval
    if (reps === 0) {
        newInterval = 1; // First review always scheduled for next day
    } else if (reps === 1) {
        newInterval = Math.min(newInterval, 6); // Cap second interval at 6 days
    } else {
        newInterval = Math.min(newInterval, Math.max(lastInterval * 2, 365)); // Cap at 2x previous interval or 365 days
    }

    // Update reps and lapses
    const newReps = reps + 1;
    const newLapses = grade === 1 ? lapses + 1 : lapses;

    return {
        difficulty: newDifficulty,
        stability: newStability,
        retrievability: retrievability,
        reps: newReps,
        lapses: newLapses,
        interval: newInterval
    };
} 