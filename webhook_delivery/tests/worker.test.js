const { startQueue } = require('../src/worker');

describe('startQueue', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('processes an event when poll returns an id', async () => {
    const queue = {
      poll: jest
        .fn()
        .mockResolvedValueOnce(42)
        .mockImplementation(() => new Promise(() => {})),
      processEvent: jest.fn().mockResolvedValue(true),
    };
    const sleep = jest.fn();

    startQueue(queue, { sleep, sleepMs: 50 });

    await Promise.resolve();
    await Promise.resolve();

    expect(queue.poll).toHaveBeenCalled();
    expect(queue.processEvent).toHaveBeenCalledWith(42);
    expect(sleep).not.toHaveBeenCalled();
  });

  test('sleeps when poll finds no work', async () => {
    const queue = {
      poll: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockImplementation(() => new Promise(() => {})),
      processEvent: jest.fn(),
    };
    const sleep = jest.fn().mockResolvedValue(undefined);

    startQueue(queue, { sleep, sleepMs: 250 });

    await Promise.resolve();
    await Promise.resolve();

    expect(queue.processEvent).not.toHaveBeenCalled();
    expect(sleep).toHaveBeenCalledWith(250);
  });

  test('sleeps and continues after processEvent throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const queue = {
      poll: jest
        .fn()
        .mockResolvedValueOnce(7)
        .mockImplementation(() => new Promise(() => {})),
      processEvent: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const sleep = jest.fn().mockResolvedValue(undefined);

    startQueue(queue, { sleep, sleepMs: 100 });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(queue.processEvent).toHaveBeenCalledWith(7);
    expect(sleep).toHaveBeenCalledWith(100);
  });
});
