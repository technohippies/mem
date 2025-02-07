import { db, PROGRESS_MODEL } from '@/db/orbis';

interface CreatePostParams {
  context: string;
  data: any;
}

interface CreatePostResult {
  status: number;
  doc: any;
}

export const getOrbisClient = async () => {
  // Return a compatibility layer that mimics the old Orbis SDK interface
  return {
    createPost: async ({ context, data }: CreatePostParams): Promise<CreatePostResult> => {
      try {
        console.log('Raw input:', data);

        // If data is an array, take the first item
        const record = Array.isArray(data) ? data[0] : data;

        // Only include fields that exist in the schema
        const cleanedData = {
          reps: record.reps,
          lapses: record.lapses,
          stability: record.stability,
          difficulty: record.difficulty,
          last_review: record.last_review,
          next_review: record.next_review,
          correct_reps: record.correct_reps,
          flashcard_id: record.flashcard_id,
          last_interval: record.last_interval,
          retrievability: record.retrievability
        };

        console.log('Cleaned data for insert:', cleanedData);

        const result = await db
          .insert(PROGRESS_MODEL)
          .value(cleanedData)
          .run();

        console.log('Insert result:', result);

        return {
          status: 200,
          doc: result
        };
      } catch (error) {
        console.error('Failed to create post:', error);
        return {
          status: 500,
          doc: null
        };
      }
    }
  };
};