// Minimal bar chart using Canvas
(function(){
  function drawBarChart(canvas, labels, values){
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.clientWidth * devicePixelRatio;
    const H = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
    const max = Math.max(1, ...values);
    const padding = 28, gap = 10;
    const barW = (canvas.clientWidth - padding*2 - gap*(values.length-1)) / values.length;
    ctx.fillStyle = '#9ec8ff';
    values.forEach((v,i)=>{
      const h = (v/max)*(canvas.clientHeight - padding*2);
      const x = padding + i*(barW+gap);
      const y = canvas.clientHeight - padding - h;
      const grad = ctx.createLinearGradient(0,y,0,y+h);
      grad.addColorStop(0,'#22c55e');
      grad.addColorStop(1,'#38bdf8');
      ctx.fillStyle = grad;
      ctx.fillRect(x,y,barW,h);
      ctx.fillStyle = '#9fb0cc';
      ctx.font = '12px -apple-system,system-ui,Arial';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i].slice(0,10), x+barW/2, canvas.clientHeight - 8);
    });
  }
  window.BMCharts = { drawBarChart };
})();