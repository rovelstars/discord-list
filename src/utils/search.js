Search = (array, string) => {
 const checkName = (name, str) => {
  var pattern = str.split("").map((x) => {
   return `(?=.*${x})`
  }).join("");
  var regex = new RegExp(`${pattern}`, "g")
  return name.match(regex);
 }
 const copied = [...array];
 if (typeof array[0] == "object") {
  array = array.map(i => {
   return JSON.stringify(i);
  })
 }
 var indexes = [];
 for(var i = 0; i < array.length; i++){
  if(checkName(array, string)){
   indexes.push(i);
  }
 }
 return indexes.map(index=>{
  return copied[index];
 });
}
module.exports = Search;