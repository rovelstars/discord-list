var arr = ["hey", "hello", "hmm", "heylo", "yellow"];

arr.filter((name, index) => {
  if (checkName(name, "h")) {
    return name;
  }
});

function earch(arr, string) {
  const copied = arr;
  if (typeof arr[0] == "object") {
    arr = arr.map((i) => {
      return JSON.stringify(i);
    });
  }
  const checkName = (name, str) => {
    var pattern = str
      .split("")
      .map((x) => {
        return `(?=.*${x})`;
      })
      .join("");
    var regex = new RegExp(`${pattern}`, "g");
    return name.match(regex);
  };
  const ind = arr.filter((name, index) => {
    if (checkName(name, string)) {
      return index;
    }
  });
  var array = [];
  for (var i = 0; i < ind.length; i++) {
    const g = ind[i];
    array.push(copied[g]);
  }
  return array;
}
const b = [
  { id: "hmm", name: "hmm" },
  { id: "ok", name: "heylo" },
];

Search = (array, string) => {
  const checkName = (name, str) => {
    var pattern = str
      .split("")
      .map((x) => {
        return `(?=.*${x})`;
      })
      .join("");
    var regex = new RegExp(`${pattern}`, "g");
    return name.match(regex);
  };
  const copied = [...array];
  if (typeof array[0] == "object") {
    array = array.map((i) => {
      return JSON.stringify(i);
    });
  }
  var indexes = [];
  for (var i = 0; i < array.length; i++) {
    if (checkName(array, string)) {
      indexes.push(i);
    }
  }
  return indexes.map((index) => {
    return copied[index];
  });
};
