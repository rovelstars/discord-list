import type { Bot } from "./bot-card";
import getAvatarURL from "@/lib/get-avatar-url";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
export default function BotPage({ bot }: { bot: Bot }) {
  return (
      <Popup
        title={`${bot.username}#${bot.discriminator} has not been approved!`}
        description={`Please do not add this bot since it's waiting for approval. You can join our server to get informed about when ${bot.username}#${bot.discriminator} will be approved. Or just sit back here and scream!`}
        shouldOpen={!bot.approved}
      />
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
