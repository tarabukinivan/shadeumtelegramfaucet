module.exports = function(tmp='',r=''){
    if(tmp.length>3900){
        //ограничение 4096
        if(r){
            tmp=tmp.slice(tmp.length-3900, tmp.length-1)
        }else{
            tmp=tmp.slice(0, 3900)
        }
        
    }
    return tmp
}
