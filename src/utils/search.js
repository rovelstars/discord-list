let Search = (array, string) => {
  string = string.toLowerCase().trim();
  const copied = [...array];
  if (typeof array[0] == "object") {
    array = array.map((i) => {
      return JSON.stringify(i);
    });
  }
  array = array.map((i) => {
    return i.toLowerCase();
  });

  var indexes = [];
  for (var i = 0; i < array.length; i++) {
    if (array[i].includes(string)) {
      indexes.push(i);
    }
  }
  return indexes.map((index) => {
    return copied[index];
  });
};

export default Search;
