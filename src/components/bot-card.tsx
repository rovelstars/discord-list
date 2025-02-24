import { Compass, Eye, UserRoundPlus, Vote } from "lucide-react";
import approx from "approximate-number";
import getAvatarURL from "@/lib/get-avatar-url";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ColorThief from "colorthief";
import { useEffect, useRef, useState } from "react";
import TwemojiText from "./twemoji-text";

interface Card {
  img: string;
  msg: string;
  title: string;
}

interface Bot {
  code?: string;
  IS_SKELETON?: boolean; //this is going to be a placeholder, remove it when you have the actual data
  card?: Card;
  owners:
    | string[]
    | { id: string; username: string; avatar: string }[]
    | unknown;
  approved?: boolean;
  servers?: number;
  promoted?: boolean;
  votes?: number;
  badges?: string[] | unknown;
  opted_coins?: boolean;
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  short: string;
  desc: string;
  prefix: string;
  lib: string;
  support: string;
  bg?: string;
  banner?: string;
  source_repo?: string;
  webhook?: string;
  website?: string;
  donate?: string;
  invite: string;
  slug?: string;
  owned?: boolean;
  status?: "online" | "offline" | "idle" | "dnd";
  addedAt?: string;
}

export type { Bot, Card };

const colorThief = new ColorThief();

export default function BotCard({ bot, edit }: { bot: Bot; edit: Boolean }) {
  const imageRef = useRef(null);
  const [bgColor, setBgColor] = useState();
  useEffect(() => {
    if (imageRef.current) {
      //@ts-ignore
      if (imageRef.current.complete) {
        setBgColor(colorThief.getColor(imageRef.current));
      } else {
        //@ts-ignore
        imageRef.current.onload = () => {
          setBgColor(colorThief.getColor(imageRef.current));
        };
      }
    }
  }, [imageRef]);
  if (bot.bg && !bot.bg.startsWith("http"))
    bot.bg = `https://cdn.discordapp.com/banners/${bot.id}/${bot.bg}.webp?size=512`;
  return (
    <div
      className="block bg-popover rounded-lg w-96 md:max-w-80 shadow-black/90 group hover:shadow-2xl hover:-translate-y-2 animation duration-300 mb-4 border"
      style={
        bot.bg
          ? {
              backgroundImage: `url(${bot.bg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {
              backgroundColor: `rgb(${bgColor})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
      }
    >
      <div
        className="h-32 w-full rounded-t-lg"
        style={
          bot.bg
            ? {
                backgroundImage: `url(${bot.bg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                backgroundColor: `rgb(${bgColor})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
        }
      />
      <div className="relative">
        {bot.IS_SKELETON ? (
          <Skeleton className="w-16 h-16 rounded-full absolute top-8 left-4 shadow-black shadow-2xl bg-muted" />
        ) : (
          <>
            <img
              src={
                bot.avatar == "0"
                  ? getAvatarURL(bot.id, bot.avatar)
                  : getAvatarURL(bot.id, bot.avatar, 96).replace("png", "webp")
              }
              ref={imageRef}
              alt="avatar"
              crossOrigin="anonymous"
              width={64}
              height={64}
              loading="lazy"
              onError={async e => {
                //we need to send an api req to update bot's info.
                const data = await (
                  await fetch(`/api/internals/update/bot/${bot.id}`)
                ).json();
                if (data.success) {
                  e.currentTarget.src = getAvatarURL(
                    bot.id,
                    data.avatar,
                    96,
                  ).replace("png", "webp");
                }
              }}
              className="z-10 w-16 h-16 rounded-full absolute -top-8 left-4 border-4 border-card bg-popover shadow-black shadow-2xl"
            />
            <span
              className={`z-10 -bottom-8 left-16 absolute w-6 h-6 ${
                bot.status == "online"
                  ? "bg-green-500"
                  : bot.status == "offline"
                  ? "bg-gray-500"
                  : bot.status == "idle"
                  ? "bg-secondary"
                  : "bg-green-500"
              } border-4 border-card rounded-full`}
            ></span>
          </>
        )}
      </div>
      <div className="pb-2 bg-popover group-hover:bg-popover/90 backdrop-blur-md animate animate-[bg] duration-300 rounded-b-md">
        <div className="mx-4 pt-12">
          {bot.IS_SKELETON ? (
            <>
              <Skeleton className="w-32 my-1 h-6" />
              <div className="flex items-center gap-1">
                <Skeleton className="w-24 my-1 h-4" />
                <Skeleton className="w-8 my-1 h-4 bg-primary" />
              </div>
            </>
          ) : (
            <div className="h-20 overflow-y-scroll">
              <h2 className="font-heading text-2xl font-semibold">
                {bot.username}
              </h2>
              <span className="relative bottom-1 text-xs text-gray-400">
                {bot.username}#{bot.discriminator}
              </span>
              <span className="relative bottom-1 ml-1 bg-primary text-white rounded-md px-1 text-xs font-heading">
                APP
              </span>
            </div>
          )}
          <div className="my-4 flex items-center">
            {bot.IS_SKELETON ? (
              <div className="flex gap-2">
                <div className="flex">
                  <Skeleton className="w-10 h-5 rounded-r-none bg-muted dark:bg-card" />
                  <Skeleton className="w-8 h-5 rounded-l-none bg-primary" />
                </div>
                <div className="flex">
                  <Skeleton className="w-12 h-5 rounded-r-none bg-muted dark:bg-card" />
                  <Skeleton className="w-6 h-5 rounded-l-none bg-green-600" />
                </div>
              </div>
            ) : (
              <>
                <Tag
                  firstClass="bg-muted dark:bg-card text-white font-sans"
                  firstChild={
                    <>
                      <Compass className="w-3 h-3 mr-1" />
                      In
                    </>
                  }
                  secondClass="bg-primary text-white"
                  secondChild={approx(bot.servers)}
                />
                <Tag
                  firstClass="bg-muted dark:bg-card text-white"
                  firstChild={
                    <>
                      <Vote className="w-4 h-4 mr-1" />
                      Votes
                    </>
                  }
                  secondClass="bg-green-600 text-white"
                  secondChild={approx(bot.votes)}
                />
              </>
            )}
          </div>
        </div>
        <div className="mx-2 bg-card pb-2 rounded-md">
          <div className="mx-2 pt-4 text-sm h-20 leading-5 overflow-y-auto rounded-md font-light">
            {bot.IS_SKELETON ? (
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  <Skeleton className="w-32 h-4" />{" "}
                  <Skeleton className="w-12 h-4" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="w-8 h-4" />{" "}
                  <Skeleton className="w-16 h-4" />{" "}
                  <Skeleton className="w-28 h-4" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="w-36 h-4" />{" "}
                  <Skeleton className="w-16 h-4" />
                </div>
              </div>
            ) : (
              <TwemojiText>{bot.short}</TwemojiText>
            )}
          </div>
          <div className="mt-8 mx-2 flex flex-col gap-2">
            {bot.IS_SKELETON ? (
              <>
                <Skeleton className="w-full h-9" />
                <Skeleton className="w-full h-9" />
              </>
            ) : (
              <>
                <a
                  href={`/bots/${bot.slug}`}
                  className={buttonVariants({
                    variant: "default",
                  })}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </a>
                <a
                  href={`${bot.invite}`}
                  className={buttonVariants({
                    variant: "outline",
                  })}
                >
                  <UserRoundPlus className="w-4 h-4 mr-2" />
                  Invite
                </a>
                {edit && (
                  <a
                    href={`/dashboard/bots/edit/${bot.id}`}
                    className={buttonVariants({
                      variant: "secondary",
                    })}
                  >
                    Edit
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag({
  firstClass,
  firstChild,
  secondClass,
  secondChild,
}: {
  firstClass: string;
  firstChild: React.ReactNode;
  secondClass: string;
  secondChild: React.ReactNode;
}) {
  return (
    <span className="flex rounded-sm text-sm font-medium text-gray-700 mr-2">
      <span className={`px-2 rounded-l-sm flex items-center ${firstClass}`}>
        {firstChild}
      </span>
      <span className={`px-2 rounded-r-sm text-center ${secondClass}`}>
        {secondChild}
      </span>
    </span>
  );
}
