// Observe actual listeners in the owned CLI process without changing bind arguments.
const net=require('node:net');
const listen=net.Server.prototype.listen;
net.Server.prototype.listen=function(...args){
 this.once('listening',()=>console.log('COOPERATIVA_OWN_LISTENER '+JSON.stringify(this.address())));
 return listen.apply(this,args);
};
