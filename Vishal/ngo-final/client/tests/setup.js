// jsdom has no ResizeObserver (charts) and does not implement scrolling.
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.scrollTo = () => {};
