import { db } from '@/db/orbis';
import { PROGRESS_MODEL } from '@/db/orbis';

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
        if (!context) {
          console.error('No context provided');
          return {
            status: 400,
            doc: null
          };
        }

        // Use PROGRESS_MODEL from constants if no context provided
        const modelId = context || PROGRESS_MODEL;
        console.log('Using model ID:', modelId);
        console.log('Raw input:', JSON.stringify(data, null, 2));

        // Handle both single records and arrays
        const records = Array.isArray(data) ? data : [data];
        
        // First check for existing entries
        const existingEntries = await Promise.all(
          records.map(async record => {
            console.log(`Checking for existing entry with flashcard_id ${record.flashcard_id} in model ${modelId}`);
            const query = db
              .select()
              .from(modelId)
              .where({ flashcard_id: record.flashcard_id })
              .context(modelId);
            
            // Log the query details
            console.log('Select Query:', {
              query: query.toString(),
              model: modelId,
              context: modelId,
              flashcard_id: record.flashcard_id
            });

            const { rows } = await query.run();
            console.log(`Found ${rows.length} existing entries for flashcard_id ${record.flashcard_id}`);
            return rows[0];
          })
        );

        console.log('Found existing entries:', existingEntries.filter(Boolean).length);

        // Handle updates for existing entries
        const updatePromises = records
          .map((record, index) => {
            const existing = existingEntries[index];
            if (!existing) return null;

            console.log(`Updating existing entry for card ${record.flashcard_id}`);
            const updateQuery = db
              .update(existing.stream_id)
              .set({
                reps: record.reps,
                lapses: record.lapses,
                stability: record.stability,
                difficulty: record.difficulty,
                last_review: record.last_review,
                next_review: record.next_review,
                correct_reps: record.correct_reps,
                last_interval: record.last_interval,
                retrievability: record.retrievability
              });

            // Log the update details
            console.log('Update Query:', {
              query: updateQuery.toString(),
              streamId: existing.stream_id,
              data: {
                reps: record.reps,
                lapses: record.lapses,
                stability: record.stability,
                difficulty: record.difficulty,
                last_review: record.last_review,
                next_review: record.next_review,
                correct_reps: record.correct_reps,
                last_interval: record.last_interval,
                retrievability: record.retrievability
              }
            });

            return updateQuery.run();
          })
          .filter(Boolean);

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          console.log('Updated existing entries:', updatePromises.length);
        }

        // Handle new entries
        const newRecords = records.filter((_, index) => !existingEntries[index]);
        console.log('New records to insert:', newRecords.length);

        if (newRecords.length === 0) {
          return {
            status: 200,
            doc: { updated: updatePromises.length }
          };
        }

        // Insert all new records at once
        const formattedRecords = newRecords.map(record => ({
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
          deck_id: record.flashcard_id.split('-')[1] // Add deck_id from flashcard_id
        }));

        console.log(`Inserting ${formattedRecords.length} records into model ${modelId}:`, JSON.stringify(formattedRecords, null, 2));
        
        // Use insertBulk with both model and context
        const insertQuery = db
          .insertBulk(modelId)
          .values(formattedRecords)
          .context(modelId);
        
        // Log the query details
        console.log('Insert Query:', {
          query: insertQuery.toString(),
          model: modelId,
          context: modelId,
          recordCount: formattedRecords.length,
          firstRecord: formattedRecords[0]
        });

        const result = await insertQuery.run();

        console.log('Insert result:', JSON.stringify(result, null, 2));

        if (result.errors && result.errors.length > 0) {
          console.error('Some records failed to insert:', result.errors);
          return {
            status: 500,
            doc: null
          };
        }

        return {
          status: 200,
          doc: {
            inserted: result.success.length,
            updated: updatePromises.length
          }
        };
      } catch (error) {
        console.error('Failed to create post:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack
          });
        }
        return {
          status: 500,
          doc: null
        };
      }
    }
  };
};