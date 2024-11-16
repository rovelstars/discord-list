// create a grid system
import type { Bot } from "@/components/bot-card";
import BotCard from "@/components/bot-card";

export default function BotCardList({ list }: { list: Bot[] }) {
  return (
    <>
      {" "}
      <div className="flex flex-wrap justify-center gap-4 mx-4">
        {list.map(bot => (
          <BotCard key={bot.id} bot={bot}/>
        ))}
        <BotCard key={"placeholder"} bot={{ IS_SKELETON: true } as Bot} />
      </div>
    </>
  );
}
