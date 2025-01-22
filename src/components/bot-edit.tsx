import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import getAvatarURL from "@/lib/get-avatar-url";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Bot } from "./bot-card";
import { Textarea } from "@/components/ui/textarea";
import BotPage from "./legacy-bot-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlurredTextCopy } from "./blurred-text-copy";
import { formSchema } from "./bot-form-schema";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);

export default function BotEditForm({ bot, user }: { bot: Bot; user: any }) {
  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lib: bot.lib,
      owners: bot.owners as string[],
      prefix: bot.prefix,
      short: bot.short,
      desc: bot.desc,
      support: bot.support,
      source_repo: bot.source_repo,
      website: bot.website,
      webhook: bot.webhook,
      bg: bot.bg,
      donate: bot.donate,
      invite: bot.invite,
      slug: bot.slug,
    },
  });

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log("Data to be sent:", JSON.stringify(values, null, 2));
    //validate
    if (true) {
      //formSchema.safeParse(values).success) {
      //send data
      fetch(`/api/bots/${bot.id}/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })
        .then(res => {
          if (!res.ok) return res.json();
          return res.json();
        })
        .then(data => {
          if (data.err) {
            if (data.err == "slug_taken") {
              data.err =
                "Vanity URL name is already taken. Please choose another one.";
            }
            toast("Failed to submit details", {
              description: data.err,
            });
          } else {
            toast("Details submitted successfully", {
              description: "Your bot details have been successfully submitted.",
            });
          }
        });
    }
  }

  return (
    <Tabs defaultValue="edit" className="md:w-3/4 mx-auto">
      <TabsList className="w-full bg-card py-8 md:py-12 md:rounded-[2.2rem]">
        <TabsTrigger
          value="edit"
          className="md:mx-2 w-full rounded-3xl py-2 md:py-4 data-[state=active]:bg-popover font-heading text-center md:text-4xl font-bold"
        >
          Edit {bot.username}#{bot.discriminator}
        </TabsTrigger>
        <TabsTrigger
          value="preview"
          className="mx-2 w-full rounded-3xl py-2 md:py-4 data-[state=active]:bg-popover font-heading text-center md:text-4xl font-bold"
        >
          Preview
        </TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <div className="bg-card p-4 rounded-lg">
          <Toaster />
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <img
                src={getAvatarURL(bot.id, bot.avatar)}
                loading="lazy"
                crossOrigin="anonymous"
                className="mx-auto w-36 h-36 rounded-full bg-card border-card border-8 mb-4"
                alt={`${bot.username}'s Avatar`}
              />
              <p className="text-center font-bold text-muted-foreground text-2xl">
                You are currently editing {bot.username}#{bot.discriminator}
              </p>
              <h2 className="font-heading text-lg mt-4 md:text-2xl font-semibold">
                General Information
              </h2>
              <FormChild
                form={form}
                name="lib"
                label="Library"
                description="The library that the bot uses."
                placeholder="discord.js, D++, etc."
              />
              <FormField
                control={form.control}
                name="owners"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owners</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123456789012345678, 123456789012345678"
                        {...field}
                        onChange={e => {
                          field.onChange(
                            e.target.value
                              .split(",")
                              .map(owner => owner.trim()),
                          );
                        }}
                      />
                    </FormControl>
                    <FormDescription>The owners of the bot.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormChild
                form={form}
                name="prefix"
                label="Prefix"
                description="The prefix for the bot. Keep this empty to denote newer slash command bots."
                placeholder="/"
              />
              <h2 className="font-heading text-lg mt-4 md:text-2xl font-semibold">
                Description
              </h2>
              <FormChild
                form={form}
                name="short"
                label="Short Description"
                description="Short description of the bot."
                placeholder="A short description of the bot."
              />
              <FormField
                control={form.control}
                name="desc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A detailed description of the bot. Supports markdown, html, css styles and iframe. Javascript not supported."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Detailed description of the bot.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <h2 className="font-heading text-lg mt-4 md:text-2xl font-semibold">
                Meta Information
              </h2>
              <FormChild
                form={form}
                name="support"
                label="Support Server"
                description="The support server for the bot."
                placeholder="https://discord.gg/invite"
              />
              <FormChild
                form={form}
                name="source_repo"
                label="Source Repository"
                description="The source repository for the bot."
                placeholder="https://github.com/rovelstars/discord-list"
              />
              <FormChild
                form={form}
                name="website"
                label="Website"
                description="The website for the bot."
                placeholder="https://example.com"
              />
              <FormChild
                form={form}
                name="webhook"
                label="Webhook"
                description="The webhook URL for the bot. Used to send vote notifications."
                placeholder="https://example.com"
              />
              <FormChild
                form={form}
                name="bg"
                label="Background Image URL"
                description="The background image for the bot."
                placeholder="https://media.server/image.png"
              />
              <FormChild
                form={form}
                name="donate"
                label="Donate URL"
                description="The donation link for the bot."
                placeholder="https://donate.url/donate"
              />
              <FormChild
                form={form}
                name="invite"
                label="Invite URL"
                description="The invite link for the bot."
                placeholder="https://discord.com/oauth2/authorize?client_id=123456789012345678&permissions=0&scope=bot"
              />
              <FormChild
                form={form}
                name="slug"
                label="Slug"
                description="The vanity URL name for the bot."
                placeholder="my-bot"
              />
              <h2 className="font-heading text-destructive text-lg mt-4 md:text-2xl font-semibold">
                Sensitive Zone
              </h2>
              <FormItem>
                <FormLabel>Bot Code</FormLabel>
                <BlurredTextCopy text={bot.code} />
                <FormDescription>
                  The bot code is a token, which is a sensitive piece of
                  information. Do not share it with anyone. This code is used to
                  authenticate the bot with our RDL API.
                </FormDescription>
                <Button type="button" variant="destructive" onClick={() => {toast("Function not implemented! Yikes...")}}>
                  Regenerate Bot Code
                </Button>
              </FormItem>
              <div className="flex justify-center">
                <Button type="submit" size="lg">
                  Submit
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </TabsContent>
      <TabsContent value="preview">
        <LivePreview form={form} bot={bot} user={user} />
      </TabsContent>
    </Tabs>
  );
}

function FormChild({ form, name, label, description, placeholder }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} {...field} />
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function LivePreview({ form, bot, user }) {
  const longdesc = marked.parse(form.getValues().desc.replace(/&gt;+/g, ">"));
  console.log(longdesc);
  const liveowners = form
    .getValues()
    .owners
    .map(owner => {
      if (owner === user.id) {
        return {
          id: user.id,
          username: user.username,
          discriminator: user.discriminator,
          avatar: user.avatar,
        };
      } else {
        return {
          id: owner,
          username: "Unknown",
          discriminator: "0000",
          avatar: 1,
        };
      }
    });

  //this uses the form hook to read the latest values as edited in the form, and reflect changes in the live preview
  return (
    <BotPage
      bot={{
        ...bot,
        ...form.getValues(),
        desc: longdesc,
        owners: liveowners,
      }}
    />
  );
}
