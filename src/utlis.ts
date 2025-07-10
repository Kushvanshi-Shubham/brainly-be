export function random(len: number): string {

  const options = "abcdefghijklmnopqrstuvwxyz0123456789";
  const optionsLength = options.length;

  let ans = "";

  for (let i = 0; i < len; i++) {
    ans += options.charAt(Math.floor(Math.random() * optionsLength));
  }

  return ans;
}