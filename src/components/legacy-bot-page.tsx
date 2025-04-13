import type { Bot } from "./bot-card";
import getAvatarURL from "@/lib/get-avatar-url";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import ColorThief from "colorthief";
import approx from "approximate-number";
import Twemoji from "react-twemoji";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronUpCircle,
  Compass,
  Github,
  Globe,
  Heart,
  LinkIcon,
  PhoneCall,
  SquareArrowOutUpRight,
  Vote,
} from "lucide-react";

import Link from "@/components/link";
import Discord from "./svgs/discord";
import toJSX from "@/lib/to-jsx";
import getBannerURL from "@/lib/get-banner-url";
import isColorDark from "@/lib/is-color-dark";

const colorThief = new ColorThief();
export default function BotPage({ bot }: { bot: Bot }) {
  if (bot.bg && !bot.bg.startsWith("http"))
    bot.bg = `https://cdn.discordapp.com/banners/${bot.id}/${bot.bg}.webp?size=2048`;
  const isDarkMode = localStorage.getItem("theme") === "dark";
  const [botBg, setBotBg] = useState<string>(bot.bg);
  console.log(bot);
  const description = toJSX({ html: bot.desc });
  const imageRef = useRef(null);
  const [bgColor, setBgColor] = useState<[number, number, number]>([0, 0, 0]);
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
  const gradientRef = useRef(null);
  const [gradientColor, setGradientColor] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  useEffect(() => {
    if (botBg) {
      if (gradientRef.current) {
        try {
          //@ts-ignore
          if (gradientRef.current.complete) {
            setGradientColor(colorThief.getColor(gradientRef.current));
          } else {
            //@ts-ignore
            gradientRef.current.onload = () => {
              setGradientColor(colorThief.getColor(gradientRef.current));
            };
          }
        } catch (e) {
          console.log(
            "Failed to get gradient color. Probably Image cannot be loaded.",
          );
        }
      }
    } else {
      setGradientColor(bgColor);
    }
  }, [gradientRef, bgColor, botBg]);
  return (
    <div className="col-span-3 w-full mx-auto bg-card min-h-screen rounded-lg shadow-black/90">
      <link rel="stylesheet" href="/css/tokyo-night-dark.min.css" />
      <div
        className="flex flex-col items-center rounded-t-lg h-72"
        style={
          botBg
            ? {
                backgroundImage: botBg.startsWith("#")
                  ? `none`
                  : `url(${botBg})`,
                backgroundColor: botBg.startsWith("#")
                  ? `${botBg}`
                  : `transparent`,
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
        {botBg && (
          <img
            src={botBg}
            loading="lazy"
            ref={gradientRef}
            width={1280}
            height={720}
            //WHO KNEW THIS TRICK LMAO
            className="w-auto h-auto opacity-0 -z-10"
            alt="bot background"
            crossOrigin="anonymous"
          />
        )}
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-4 md:gap-4 p-4 bg-gradient-to-b via-transparent to-transparent "
        style={{
          //@ts-ignore
          "--tw-gradient-from": `rgba(${gradientColor?.join?.(
            ",",
          )}, 0.1) var(--tw-gradient-from-position)`,
          "--tw-gradient-to": `rgba(${gradientColor?.join?.(
            ",",
          )}, 0.01) var(--tw-gradient-to-position)`,
          "--tw-gradient-stops":
            "var(--tw-gradient-from), var(--tw-gradient-to)",
        }}
      >
        <div
          className="flex flex-col col-span-3 border-popover px-4 pb-8 border-b-2 md:border-b-0 md:border-r-2 h-full"
          style={
            isColorDark(gradientColor) && isDarkMode
              ? {
                  borderColor: `rgb(${gradientColor})`,
                }
              : {}
          }
        >
          <img
            ref={imageRef}
            loading="lazy"
            src={getAvatarURL(bot.id, bot.avatar)}
            crossOrigin="anonymous"
            className="bot-img w-36 h-36 rounded-full bg-card border-card border-8 mt-[-5.3rem] mb-4 mx-auto md:mx-0"
            alt={`${bot.username}'s Avatar`}
          />
          <h1 className="bot-name text-3xl md:text-5xl font-heading text-center md:text-start my-4 font-black">
            {bot.username}
            <span className="text-muted text-lg mx-2 font-bold">
              #{bot.discriminator}
            </span>
          </h1>
          <div
            className="border-b-2 pb-4"
            style={
              isColorDark(gradientColor) && isDarkMode
                ? {
                    borderColor: `rgb(${gradientColor})`,
                  }
                : {}
            }
          >
            <span className="text-2xl text-primary text-center md:text-left">
              <Twemoji
                options={{
                  className:
                    "twemoji w-auto h-[1em] inline-flex -translate-y-0.5 m-0",
                }}
              >
                {bot.short}
              </Twemoji>
            </span>
          </div>
          <div
            className="mt-8 min-w-full prose md:prose-xl dark:prose-invert prose-inline-code:before:content-['']
          prose-inline-code:after:content-[''] prose-inline-code:bg-popover prose-inline-code:px-2
          prose-inline-code:py-1 prose-inline-code:rounded-md prose-pre:bg-card prose-code:rounded-lg prose-code:font-mono prose-code:font-semibold"
          >
            <Twemoji
              options={{
                className:
                  "twemoji w-auto h-[1em] inline-flex -translate-y-0.5 m-0",
              }}
            >
              {description}
            </Twemoji>
          </div>
        </div>
        <div className="mt-6 md:mt-0 flex flex-col col-span-1 w-full">
          <div className="px-4 mx-auto md:mx-0">
            <Label
              className="flex text-muted my-1 text-md"
              style={
                isColorDark(gradientColor)
                  ? {
                      color: `rgb(${gradientColor})`,
                    }
                  : {}
              }
            >
              <Compass className="w-5 h-5 mr-1 mt-0.5 text-primary/70" />
              <span>
                in <span className="font-semibold">{approx(bot.servers)}</span>{" "}
                servers
              </span>
            </Label>
            <Label
              className="flex text-muted my-1 text-md"
              style={
                isColorDark(gradientColor)
                  ? {
                      color: `rgb(${gradientColor})`,
                    }
                  : {}
              }
            >
              <Vote className="w-5 h-5 mr-1 mt-0.5 text-green-600/70" />
              <span>
                with <span className="font-semibold">{approx(bot.votes)}</span>{" "}
                votes
              </span>
            </Label>
            <Label
              className="flex text-muted my-1 text-md"
              style={
                isColorDark(gradientColor)
                  ? {
                      color: `rgb(${gradientColor})`,
                    }
                  : {}
              }
            >
              <PhoneCall className="w-5 h-5 mr-1 mt-0.5 text-secondary/70" />
              {bot.prefix == "/" || !bot.prefix ? (
                <span>Slash Bot</span>
              ) : (
                <span>
                  Prefix is{" "}
                  <span className="font-semibold text-muted-foreground bg-popover py-0.5 px-2 rounded-md border border-1 border-muted-foreground/20">
                    {bot.prefix}
                  </span>
                </span>
              )}
            </Label>
            {bot.lib && (
              <Label
                className="flex text-muted my-1 text-md"
                style={
                  isColorDark(gradientColor)
                    ? {
                        color: `rgb(${gradientColor})`,
                      }
                    : {}
                }
              >
                <Heart className="w-5 h-5 mr-1 mt-0.5 text-destructive/70" />
                <span>
                  Made with <span className="font-semibold">{bot.lib}</span>
                </span>
              </Label>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                className="mt-4 w-1/2 mx-auto md:mx-4 md:w-auto"
              >
                <SquareArrowOutUpRight className="w-4 h-4 mr-2" />
                Invite
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Invite Type</DropdownMenuLabel>
              <DropdownMenuItem>
                <Link
                  href={
                    bot.invite ||
                    `https://discord.com/oauth2/authorize?client_id=${bot.id}&scope=bot+applications.commands&permissions=0`
                  }
                  className="inline-flex text-blue-500 hover:underline"
                >
                  Original Invite
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link
                  href={`https://discord.com/oauth2/authorize?scope=bot+applications.commands&permissions=0&client_id=${bot.id}`}
                  className="inline-flex text-blue-500 hover:underline"
                >
                  Invite Without Any Permissions
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="mt-4 w-1/2 mx-auto md:mx-4 md:w-auto votebutton"
            asChild
          >
            <Link href={`/bots/${bot.id}/vote`}>
              <ChevronUpCircle className="w-4 h-4 mr-2" /> Vote
            </Link>
          </Button>
          <div
            className="border-b-2 my-8 w-12 mx-auto"
            style={
              isColorDark(gradientColor)
                ? {
                    borderColor: `rgb(${gradientColor})`,
                  }
                : {}
            }
          />
          <p
            className="inline-flex text-muted text-md font-semibold mb-2 mx-auto md:mx-0 md:ml-auto md:mr-3 cursor-default"
            style={
              isColorDark(gradientColor)
                ? {
                    color: `rgb(${gradientColor})`,
                  }
                : {}
            }
          >
            <LinkIcon className="w-5 h-5 mr-1 mt-0.5" />
            Links
          </p>
          <div className="flex flex-col mx-auto md:mx-0">
            {bot.website && (
              <Button
                variant="link"
                size="sm"
                className="w-auto md:w-min ml-auto"
                asChild
              >
                <Link href={bot.website} className="inline-flex">
                  <Globe className="w-4 h-4" />
                  Website
                </Link>
              </Button>
            )}
            {bot.source_repo && (
              <Button
                variant="link"
                size="sm"
                className="w-auto md:w-min ml-auto"
                asChild
              >
                <Link href={bot.source_repo} className="inline-flex">
                  <Github className="w-4 h-4" />
                  GitHub
                </Link>
              </Button>
            )}
            {bot.support && (
              <Button
                variant="link"
                size="sm"
                className="w-auto md:w-min ml-auto"
                asChild
              >
                <Link
                  href={new URL(bot.support, "https://discord.gg").toString()}
                  className="inline-flex"
                >
                  <Discord className="w-4 h-4" />
                  Support Server
                </Link>
              </Button>
            )}
            {bot.donate && (
              <Button
                variant="link"
                size="sm"
                className="w-auto md:w-min ml-auto"
                asChild
              >
                <Link href={bot.donate} className="inline-flex">
                  <Heart className="w-4 h-4" />
                  Donate
                </Link>
              </Button>
            )}
            {!bot.website &&
              !bot.source_repo &&
              !bot.support &&
              !bot.support && (
                <p
                  className="text-muted text-md font-semibold mb-2 mx-auto md:mx-0 md:ml-auto"
                  style={{
                    color: `rgb(--gradient-border-color)`,
                  }}
                >
                  No links available
                </p>
              )}
          </div>
          <div
            className="border-b-2 my-8 w-12 mx-auto"
            style={
              isColorDark(gradientColor)
                ? {
                    borderColor: `rgb(${gradientColor})`,
                  }
                : {}
            }
          />
          <p
            className="owners inline-flex text-muted text-md font-semibold mb-2 mx-auto md:mx-0 md:ml-auto md:mr-3 cursor-default"
            style={
              isColorDark(gradientColor)
                ? {
                    color: `rgb(${gradientColor})`,
                  }
                : {}
            }
          >
            <LinkIcon className="w-5 h-5 mr-1 mt-0.5" />
            Owners
          </p>
          {
            //show buttons for owners
            (
              bot.owners as { id: string; avatar: string; username: string }[]
            ).map(owner => (
              <Button
                key={owner.id || owner.toString()}
                variant="ghost"
                className="w-full md:w-auto ml-auto bg-background rounded-full px-4 py-8 text-black dark:text-white hover:bg-slate-100 dark:hover:bg-popover font-semibold"
                asChild
              >
                <Link
                  href={`/users/${owner.id}`}
                  className="inline-flex items-center my-2"
                >
                  <img
                    loading="lazy"
                    src={getAvatarURL(owner.id, owner.avatar)}
                    onError={e => {
                      e.currentTarget.src = `https://cdn.discordapp.com/embed/avatars/0.png`;
                    }}
                    className="w-12 h-12 mr-4 rounded-full"
                    alt={`${owner.username}'s Avatar`}
                  />
                  {owner.username}
                </Link>
              </Button>
            ))
          }
        </div>
      </div>
    </div>
  );
}
