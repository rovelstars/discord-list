
import type { Bot } from "@/components/bot-card";
import BotCardList from "@/components/bot-card-list";
import useSWR from "swr";
import * as motion from "motion/react-client";
//@ts-ignore
const fetcher = (...args) => fetch(...args).then(res => res.json());

export default function Page() {
  const { data, error, isLoading } = useSWR("/api/bots", fetcher);
  return (
    <div>
      {error && <p>Error: {error}</p>}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 1, delay: 1 } }}
        className="font-heading text-4xl font-bold mb-4 text-center"
      >
        We could say its the same old Rovel Discord List
      </motion.h1>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 1, delay: 2 } }}
        className="font-heading text-3xl font-bold mb-4 text-center"
      >
        But its not...
      </motion.h2>
      {isLoading && (
        <BotCardList
          list={
            Array.from({ length: 10 }, id => {
              return { id, IS_SKELETON: true };
            }) as unknown as Bot[]
          }
        />
      )}
      {data && <BotCardList list={data} />}
    </div>
  );
}
