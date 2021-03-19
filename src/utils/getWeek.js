function getWeek() {
  const date = new Date;
  const yearStart = +new Date(date.getFullYear(), 0, 1);
  const today = +new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfYear = ((today - yearStart + 1) / 86400000);

  return Math.ceil(dayOfYear / 7).toString();
}
module.exports = getWeek;