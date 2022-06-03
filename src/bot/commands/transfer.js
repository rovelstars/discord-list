if (!args.length) {
message.reply({content: "You forgot to ping or write the ID of the user to whom you're going to transfer money dumbo!"});
} else {
  const usern = getMention(args[0]);
  if (!usern) {
    message.reply({
      content:
        "What!? Doesn't seems to be a valid user... <:wtf:825723176176713739>",
    });
  }
  Users.findOne({ id: usern.id }).then((user) => {
    if (!user)
      message.channel.send({
        content: "Uh, It seems as if " + usern.tag + " never logged in on RDL... 😔"
      });
    else {
      Cache.Users.findOne({id: message.author.id}).then((uu)=>{
      if(isNaN(args[1]) && (args[1]!="--all")){
        message.reply({content: "You need to specify the amount of <:Rcoin:948896802298548224> that you want to send."});
      }
      if(args[1]=="--all"){
        var hmm=uu.bal;
        uu.bal=0;
        user.bal+=hmm;
        //this fixes the bug where transferring back the R$ doesn't turns the amount to zero!
        user.save();
        setTimeout(()=>{uu.save();},100); //this fixes the wierd problem with parallel save error.
        message.reply({content: `Sent <:Rcoin:948896802298548224> ${uu.bal} to ${user.tag}!\n${user.username}'s Balance: <:Rcoin:948896802298548224> ${user.bal}\nYour balance is <:Rcoin:948896802298548224> ${uu.bal +((uu.id==user.id)?" (It should be 0 right? Well idk what happened!)":"!Go and start earning some <:Rcoin:948896802298548224>!")}`});
      }
      if(!isNaN(args[1])){
        if(parseInt(args[1])>uu.bal){
          message.reply({content: `Couldn't send <:Rcoin:948896802298548224> ${args[1]} to ${user.tag}, due to insufficient balance! Please earn the required amount or lower the transaction amount.`});
        }
        else {
          user.bal+=parseInt(args[1]);
          uu.bal-=parseInt(args[1]);
          user.save();
          setTimeout(()=>{uu.save();},100); //this fixes the wierd problem with parallel save error.
        message.reply({content: `Sent <:Rcoin:948896802298548224> ${args[1]} to ${user.tag}!\n${user.username}'s Balance: <:Rcoin:948896802298548224> ${user.bal}\nYour balance is <:Rcoin:948896802298548224> ${uu.bal}!`});
        }
      }
      });
    }
  });
}
