import type { Bot } from "./bot-card";
import getAvatarURL  from "@/lib/get-avatar-url";
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
  LinkIcon,
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
  if(bot.bg && !bot.bg.startsWith("http")) bot.bg = `https://cdn.discordapp.com/banners/${bot.id}/${bot.bg}.webp?size=2048`;
  const isDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [botBg, setBotBg] = useState<string>(bot.bg);
  
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
            "Failed to get gradient color. Probably Image cannot be loaded."
          );
        }
      }
    } else {
      setGradientColor(bgColor);
    }
  }, [gradientRef, bgColor, botBg]);
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="col-span-3 w-full mx-auto bg-card min-h-screen rounded-lg shadow-black/90"
    >
      <div
        className="flex flex-col items-center md:rounded-t-lg h-72"
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
          "--tw-gradient-from": `rgba(${gradientColor?.join?.(",")}, 0.1) var(--tw-gradient-from-position)`,
          "--tw-gradient-to": `rgba(${gradientColor?.join?.(",")}, 0.01) var(--tw-gradient-to-position)`,
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
            src={getAvatarURL(bot.id, bot.avatar)}
            crossOrigin="anonymous"
            className="w-36 h-36 rounded-full bg-card border-card border-8 mt-[-5.3rem] mb-4"
            alt={`${bot.username}'s Avatar`}
          />
          <h1 className="text-3xl md:text-5xl font-heading text-center md:text-start my-4 font-black">
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
            <span className="text-2xl text-primary">
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
          <div className="mt-8 min-w-full prose md:prose-xl dark:prose-invert prose-code:before:content-[''] prose-code:after:content-[''] prose-code:bg-popover prose-code:px-2 prose-code:py-1 prose-code:rounded-md">
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
        <div className="flex flex-col col-span-1 w-full">
          <Label
            className="flex text-muted text-md justify-center"
            style={
              isColorDark(gradientColor)
                ? {
                    color: `rgb(${gradientColor})`,
                  }
                : {}
            }
          >
            <Compass className="w-5 h-5 mr-1 mt-0.5 text-primary/70" /> in{" "}
            {approx(bot.servers)} servers
          </Label>
          <Label
            className="flex text-muted text-md justify-center"
            style={
              isColorDark(gradientColor)
                ? {
                    color: `rgb(${gradientColor})`,
                  }
                : {}
            }
          >
            <Vote className="w-5 h-5 mr-1 mt-0.5 text-green-600/70" /> with{" "}
            {approx(bot.votes)} votes
          </Label>

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
                  href={bot.invite}
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
            className="mt-4 w-1/2 mx-auto md:mx-4 md:w-auto"
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
            className="inline-flex text-muted text-md font-semibold mb-2 mx-auto md:mx-0 md:ml-auto cursor-default"
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
          {bot.website && (
            <Button
              variant="link"
              size="sm"
              className="w-auto md:w-min ml-auto"
              asChild
            >
              <Link href={bot.website} className="inline-flex">
                <Globe className="w-4 h-4 mr-2" />
                Website
              </Link>
            </Button>
          )}
          {bot.github && (
            <Button
              variant="link"
              size="sm"
              className="w-auto md:w-min ml-auto"
              asChild
            >
              <Link href={bot.github} className="inline-flex">
                <Github className="w-4 h-4 mr-2" />
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
                href={new URL(bot.support, "https://discord.gg/").toString()}
                className="inline-flex"
              >
                <Discord className="w-4 h-4 mr-2" />
                Support Server
              </Link>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
