const func = (a, b = false, c = false) => {
  if (!b){
    if(!c){
      console.log(a);
    } else {
      console.log(1);
    }
  } else {
    if(!c){
      console.log(3);
    } else {
      console.log(2);
    }
  }
};

func(0);

func(0, true);

func(0, true, false);

func(0, false, true);

func(0, true, true);
