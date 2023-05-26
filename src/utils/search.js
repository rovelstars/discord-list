const search = (array, string) => {
  const searchString = string.toLowerCase().trim();
  const copiedArray = [...array];

  const transformedArray = array.map((element) => {
    if (typeof element === "object") {
      return JSON.stringify(element).toLowerCase();
    }
    return element.toLowerCase();
  });

  const indexes = transformedArray.reduce((acc, element, index) => {
    if (element.includes(searchString)) {
      acc.push(index);
    }
    return acc;
  }, []);

  return indexes.map((index) => copiedArray[index]);
};

module.exports = search;
