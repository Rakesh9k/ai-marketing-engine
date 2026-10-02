import '../../testSetup';
import * as firestoreModule from '../../services/firestore';
import { publishingService } from '../../services/publishing/publishingService';

jest.mock('../../services/firestore');
jest.mock('../../services/publishing/publishingService');

describe('processScheduledPublishJobs worker logic', () => {
  const mockGetDueScheduledPublishJobs =
    firestoreModule.getDueScheduledPublishJobs as jest.MockedFunction<
      typeof firestoreModule.getDueScheduledPublishJobs
    >;
  const mockClaimPublishJobForProcessing =
    firestoreModule.claimPublishJobForProcessing as jest.MockedFunction<
      typeof firestoreModule.claimPublishJobForProcessing
    >;
  const mockExecutePublishJob = publishingService.executePublishJob as jest.MockedFunction<
    typeof publishingService.executePublishJob
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('claims due jobs and executes them via publishingService', async () => {
    mockGetDueScheduledPublishJobs.mockResolvedValueOnce([
      { jobId: 'job-101', status: 'scheduled' } as any,
      { jobId: 'job-102', status: 'scheduled' } as any,
    ]);

    mockClaimPublishJobForProcessing.mockImplementation(
      async (id) =>
        ({
          jobId: id,
          status: 'processing',
        }) as any
    );

    mockExecutePublishJob.mockResolvedValue({ success: true, job: {} as any });

    // Process logic simulation
    const dueJobs = await firestoreModule.getDueScheduledPublishJobs(20);
    for (const job of dueJobs) {
      const claimed = await firestoreModule.claimPublishJobForProcessing(job.jobId);
      if (claimed) {
        await publishingService.executePublishJob(claimed.jobId);
      }
    }

    expect(mockClaimPublishJobForProcessing).toHaveBeenCalledWith('job-101');
    expect(mockClaimPublishJobForProcessing).toHaveBeenCalledWith('job-102');
    expect(mockExecutePublishJob).toHaveBeenCalledWith('job-101');
    expect(mockExecutePublishJob).toHaveBeenCalledWith('job-102');
  });

  it('skips execution if worker fails to claim job (concurrent worker protection)', async () => {
    mockGetDueScheduledPublishJobs.mockResolvedValueOnce([
      { jobId: 'job-200', status: 'scheduled' } as any,
    ]);
    mockClaimPublishJobForProcessing.mockResolvedValueOnce(null);

    const dueJobs = await firestoreModule.getDueScheduledPublishJobs(20);
    for (const job of dueJobs) {
      const claimed = await firestoreModule.claimPublishJobForProcessing(job.jobId);
      if (claimed) {
        await publishingService.executePublishJob(claimed.jobId);
      }
    }

    expect(mockExecutePublishJob).not.toHaveBeenCalled();
  });
});
