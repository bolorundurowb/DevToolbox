import {
  NugetTreeComponent,
  PackageEntry,
  NugetEvent,
  bestFramework,
  pkgKey,
} from './nuget-tree.component';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeComponent(): NugetTreeComponent {
  const c = new NugetTreeComponent();
  return c;
}

type EventCallback = (e: NugetEvent) => void;

/** Builds a fake startResolution that replays a list of events synchronously. */
function fakeResolution(events: NugetEvent[]): NugetTreeComponent['startResolution'] {
  return (_id, _ver, onEvent) => {
    return new Promise<void>(resolve => {
      events.forEach(e => onEvent(e));
      resolve();
    });
  };
}

function simpleEntry(id: string, version = '1.0.0'): PackageEntry {
  return { id, version, frameworkGroups: [], truncated: false };
}

// ── NugetTreeComponent ────────────────────────────────────────────────────────

describe('NugetTreeComponent', () => {

  it('populates rootId/rootVersion/rootFrameworks from Header event', async () => {
    const c = makeComponent();
    c.startResolution = fakeResolution([
      {
        type: 'header', id: 'My.Package', version: '2.0.0',
        frameworkGroups: [{ framework: 'netstandard2.0', deps: [] }],
      },
      { type: 'done', totalNodes: 1, truncated: false },
    ]);
    c.packageId      = 'My.Package';
    c.packageVersion = '2.0.0';

    await c.resolve();

    expect(c.rootId()).toBe('My.Package');
    expect(c.rootVersion()).toBe('2.0.0');
    expect(c.rootFrameworks()).toEqual([{ framework: 'netstandard2.0', deps: [] }]);
  });

  it('adds PackageData entries to the registry', async () => {
    const c = makeComponent();
    c.startResolution = fakeResolution([
      {
        type: 'header', id: 'Root', version: '1.0.0',
        frameworkGroups: [
          { framework: 'netstandard2.0', deps: [{ id: 'Dep.A', version: '3.0.0', circular: false }] },
        ],
      },
      {
        type: 'packageData', id: 'Dep.A', version: '3.0.0',
        frameworkGroups: [], truncated: false,
      },
      { type: 'done', totalNodes: 2, truncated: false },
    ]);
    c.packageId      = 'Root';
    c.packageVersion = '1.0.0';

    await c.resolve();

    const key = pkgKey('Dep.A', '3.0.0');
    expect(c.registry().has(key)).toBeTrue();
    expect(c.registry().get(key)!.id).toBe('Dep.A');
  });

  it('sets isDone and totalNodes on Done event', async () => {
    const c = makeComponent();
    c.startResolution = fakeResolution([
      { type: 'header', id: 'X', version: '1.0.0', frameworkGroups: [] },
      { type: 'done', totalNodes: 7, truncated: false },
    ]);
    c.packageId      = 'X';
    c.packageVersion = '1.0.0';

    await c.resolve();

    expect(c.isDone()).toBeTrue();
    expect(c.totalNodes()).toBe(7);
    expect(c.loading()).toBeFalse();
  });

  it('sets isTruncated when Done event has truncated:true', async () => {
    const c = makeComponent();
    c.startResolution = fakeResolution([
      { type: 'header', id: 'X', version: '1.0.0', frameworkGroups: [] },
      { type: 'done', totalNodes: 25, truncated: true },
    ]);
    c.packageId      = 'X';
    c.packageVersion = '1.0.0';

    await c.resolve();

    expect(c.isTruncated()).toBeTrue();
  });

  it('surfaces Error events to the error signal', async () => {
    const c = makeComponent();
    c.startResolution = fakeResolution([
      { type: 'error', message: 'Package not found' },
    ]);
    c.packageId      = 'Unknown.Package';
    c.packageVersion = '0.0.0';

    await c.resolve();

    expect(c.error()).toBe('Package not found');
    expect(c.loading()).toBeFalse();
  });

  it('surfaces rejected invoke errors to the error signal', async () => {
    const c = makeComponent();
    c.startResolution = () => Promise.reject(new Error('NuGet request timed out'));
    c.packageId      = 'X';
    c.packageVersion = '1.0.0';

    await c.resolve();

    expect(c.error()).toBe('NuGet request timed out');
    expect(c.loading()).toBeFalse();
  });

  it('ignores events from a superseded run', async () => {
    const c = makeComponent();

    let firstOnEvent: EventCallback | undefined;
    const firstResolved = new Promise<void>(res => {
      const firstPromise = new Promise<void>(innerRes => {
        c.startResolution = (_id, _ver, onEvent) => {
          firstOnEvent = onEvent;
          return firstPromise;
        };
      });
    });

    // Start first resolve — it suspends at startResolution
    let firstResolveInner!: () => void;
    const firstSuspended = new Promise<void>(res => {
      const p = new Promise<void>(innerRes => { firstResolveInner = innerRes; });
      c.startResolution = (_id, _ver, onEvent) => {
        firstOnEvent = onEvent;
        return p;
      };
    });

    c.packageId      = 'First.Package';
    c.packageVersion = '1.0.0';
    const firstRun = c.resolve();  // starts but doesn't await — hangs until firstResolveInner

    // Second resolve completes synchronously
    c.startResolution = fakeResolution([
      { type: 'header', id: 'Second.Package', version: '2.0.0', frameworkGroups: [] },
      { type: 'done', totalNodes: 1, truncated: false },
    ]);
    c.packageId      = 'Second.Package';
    c.packageVersion = '2.0.0';
    await c.resolve();

    // Now deliver first run's events (stale) and settle the first promise
    firstOnEvent?.({
      type: 'header', id: 'First.Package', version: '1.0.0', frameworkGroups: [],
    });
    firstResolveInner();
    await firstRun;

    // Second run's result must be preserved
    expect(c.rootId()).toBe('Second.Package');
    expect(c.loading()).toBeFalse();
  });

  it('resets state on each new resolve call', async () => {
    const c = makeComponent();
    // First resolve puts data in
    c.startResolution = fakeResolution([
      {
        type: 'header', id: 'A', version: '1.0.0',
        frameworkGroups: [{ framework: 'net6.0', deps: [] }],
      },
      { type: 'done', totalNodes: 1, truncated: false },
    ]);
    c.packageId      = 'A';
    c.packageVersion = '1.0.0';
    await c.resolve();
    expect(c.rootId()).toBe('A');

    // Second resolve should clear first
    c.startResolution = fakeResolution([
      { type: 'error', message: 'Version not found' },
    ]);
    c.packageId      = 'B';
    c.packageVersion = '9.9.9';
    await c.resolve();

    expect(c.rootId()).toBe('');
    expect(c.error()).toBe('Version not found');
    expect(c.registry().size).toBe(0);
  });
});

// ── bestFramework ─────────────────────────────────────────────────────────────

describe('bestFramework', () => {

  it('returns null when no frameworks available', () => {
    expect(bestFramework('netstandard2.0', [])).toBeNull();
  });

  it('exact match wins over everything', () => {
    expect(bestFramework('net6.0', ['net6.0', 'netstandard2.0'])).toBe('net6.0');
  });

  it('netstandard context picks highest compatible netstandard', () => {
    const result = bestFramework('netstandard2.0', [
      'netstandard1.3', 'netstandard1.6', 'netstandard2.0', 'netstandard2.1',
    ]);
    // netstandard2.1 > context (2.0), so skip; 2.0 is exact match
    expect(result).toBe('netstandard2.0');
  });

  it('netstandard context picks highest ≤ context when exact absent', () => {
    const result = bestFramework('netstandard2.0', [
      'netstandard1.3', 'netstandard1.6', 'netstandard2.1',
    ]);
    // 2.1 > 2.0 → excluded; picks highest remaining = 1.6
    expect(result).toBe('netstandard1.6');
  });

  it('net6+ context prefers netstandard over lower net5+ versions', () => {
    const result = bestFramework('net6.0', [
      'netstandard2.0', 'net5.0',
    ]);
    // No exact net6.0; no netstandard higher-priority wins first
    expect(result).toBe('netstandard2.0');
  });

  it('net6+ context falls back to highest net5+ ≤ context when no netstandard', () => {
    const result = bestFramework('net6.0', [
      'net5.0', 'net7.0',
    ]);
    // net7.0 > context → excluded; picks net5.0
    expect(result).toBe('net5.0');
  });

  it('falls back to "any" catch-all', () => {
    expect(bestFramework('net6.0', ['any'])).toBe('any');
  });

  it('falls back to first available when nothing matches', () => {
    const result = bestFramework('netstandard2.0', ['net481', 'net462']);
    expect(result).toBe('net481');
  });
});

// ── pkgKey ────────────────────────────────────────────────────────────────────

describe('pkgKey', () => {
  it('lower-cases both parts', () => {
    expect(pkgKey('Newtonsoft.Json', '13.0.3')).toBe('newtonsoft.json@13.0.3');
  });

  it('produces a consistent key regardless of input case', () => {
    expect(pkgKey('My.Pkg', '1.0.0')).toBe(pkgKey('my.pkg', '1.0.0'));
  });
});
