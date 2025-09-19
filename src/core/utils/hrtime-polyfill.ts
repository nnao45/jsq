export function hrtime(previousTimestamp?: [number, number]): [number, number] {
  // ブラウザ環境チェック
  if (typeof process !== 'undefined' && process.hrtime) {
    return process.hrtime(previousTimestamp);
  }

  // ブラウザではperformance.now()を使う
  const nowInMs = typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();

  const nowInNs = nowInMs * 1e6;
  const seconds = Math.floor(nowInNs / 1e9);
  const nanoseconds = Math.floor(nowInNs % 1e9);

  if (!previousTimestamp) {
    return [seconds, nanoseconds];
  }

  // 差分計算
  const prevSeconds = previousTimestamp[0];
  const prevNanoseconds = previousTimestamp[1];
  
  let diffSeconds = seconds - prevSeconds;
  let diffNanoseconds = nanoseconds - prevNanoseconds;
  
  // ナノ秒がマイナスの場合は調整
  if (diffNanoseconds < 0) {
    diffSeconds--;
    diffNanoseconds += 1e9;
  }
  
  return [diffSeconds, diffNanoseconds];
}