// stand-in for `three` in browser harness bundles (the real app uses window.THREE; UI code never imports it).
throw new Error('three must not be imported by UI code');
