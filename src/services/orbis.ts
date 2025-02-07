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

        // Handle both single records and arrays
        const records = Array.isArray(data) ? data : [data];
        
        // Clean each record to only include schema fields
        const cleanedRecords = records.map(record => ({
          reps: record.reps,
          lapses: record.lapses,
          stability: record.stability,
          difficulty: record.difficulty,
          last_review: record.last_review,
          next_review: record.next_review,
          correct_reps: record.correct_reps,
          flashcard_id: record.flashcard_id,
          last_interval: record.last_interval,
          retrievability: record.retrievability,
          _context: context // Add context to each record
        }));

        console.log('Cleaned data for bulk insert:', cleanedRecords);

        const { success, errors } = await db
          .insertBulk(PROGRESS_MODEL)
          .values(cleanedRecords)
          .run();

        console.log('Bulk insert result:', { success, errors });

        if (errors.length > 0) {
          console.error('Some records failed to insert:', errors);
          return {
            status: 500,
            doc: null
          };
        }

        return {
          status: 200,
          doc: success
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