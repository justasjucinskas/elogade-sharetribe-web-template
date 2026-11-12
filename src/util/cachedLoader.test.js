import { createCachedLoader } from './cachedLoader';

describe('createCachedLoader', () => {
  let time;
  const now = () => time;

  beforeEach(() => {
    time = 1000;
  });

  it('reuses a result until the TTL runs out', async () => {
    const load = jest.fn(() => Promise.resolve(time));
    const cachedLoad = createCachedLoader(load, { ttlMs: 100, now });

    expect(await cachedLoad()).toBe(1000);
    time = 1099;
    expect(await cachedLoad()).toBe(1000);
    expect(load).toHaveBeenCalledTimes(1);

    time = 1100;
    expect(await cachedLoad()).toBe(1100);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shares one load between calls made while it is running', async () => {
    let resolveLoad;
    const load = jest.fn(
      () =>
        new Promise(resolve => {
          resolveLoad = resolve;
        })
    );
    const cachedLoad = createCachedLoader(load, { ttlMs: 100, now });

    const first = cachedLoad('a');
    const second = cachedLoad('b');
    await Promise.resolve();
    resolveLoad('value');

    expect(await first).toBe('value');
    expect(await second).toBe('value');
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith('a');
  });

  it('returns but does not keep a result that shouldCache rejects', async () => {
    const results = ['incomplete', 'complete'];
    const load = jest.fn(() => Promise.resolve(results.shift()));
    const cachedLoad = createCachedLoader(load, {
      ttlMs: 100,
      now,
      shouldCache: value => value === 'complete',
    });

    expect(await cachedLoad()).toBe('incomplete');
    expect(await cachedLoad()).toBe('complete');
    expect(await cachedLoad()).toBe('complete');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not keep a failed load, so the next call retries', async () => {
    const load = jest
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error('down')))
      .mockImplementationOnce(() => Promise.resolve('ok'));
    const cachedLoad = createCachedLoader(load, { ttlMs: 100, now });

    await expect(cachedLoad()).rejects.toThrow('down');
    expect(await cachedLoad()).toBe('ok');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('clear() forgets the cached result', async () => {
    const load = jest.fn(() => Promise.resolve('value'));
    const cachedLoad = createCachedLoader(load, { ttlMs: 100, now });

    await cachedLoad();
    cachedLoad.clear();
    await cachedLoad();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
