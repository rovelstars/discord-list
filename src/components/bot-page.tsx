import type { Bot } from "./bot-card";
import getAvatarURL from "@/lib/getAvatarURL";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function BotPage({ bot }: { bot: Bot }) {
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
    >
      <h1 className="font-heading text-4xl font-bold mb-4 text-center">
        {bot.username}#{bot.discriminator}
      </h1>
      <div className="flex justify-center">
        <img
          src={getAvatarURL(bot.id, bot.avatar)}
          alt={`${bot.username}#${bot.discriminator}`}
          className="w-24 h-24 rounded-full"
        />
      </div>
      <Popup
        title={`${bot.username}#${bot.discriminator} has not been listed!`}
        description={`Please do not add this bot since it's waiting for approval. You can join our server to get informed about when Ayako will be approved. Or just sit back here and scream!`}
        shouldOpen={!bot.added}
      />
    </motion.div>
  );
}

export function Popup({
  title,
  description,
  shouldOpen,
}: {
  title: string;
  description: string;
  shouldOpen?: boolean;
}) {
  console.log(shouldOpen);
  const [open, setOpen] = useState(Boolean(shouldOpen));
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-3xl text-center">
              {title}
            </DialogTitle>
            <DialogDescription className="py-8 text-center text-md">
              {description}
            </DialogDescription>
          </DialogHeader>
          <DrawerClose asChild>
            <Button variant="default">OK</Button>
          </DrawerClose>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={true}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-heading text-3xl text-center">
            {title}
          </DrawerTitle>
          <DrawerDescription className="py-8 text-center text-md">
            {description}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="default">OK</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
