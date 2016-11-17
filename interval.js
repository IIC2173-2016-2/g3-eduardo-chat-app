let a = 0;
console.log("Before Interval");
const setInter = () => {
  const func = setInterval(
    () => {
      console.log(a);
      console.log("Hola");
      if (a > 5){
        clearInterval(func);
      }
      a++;
    }
    , 1000);
}
console.log("After Interval");
const b = 4 + 3;
console.log(b);
setInter();
