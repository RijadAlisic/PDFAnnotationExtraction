// Catch all rogue logs and send them to stderr
console.log = console.error;
console.info = console.error;
console.warn = console.error;