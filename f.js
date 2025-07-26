setInterval(async () => {
  try {
    const res = await fetch('https://autobumpr.onrender.com/bump'); 
    const data = await res.json();
    console.log(data)
  } catch (err) {
    
  }
}, 0);
