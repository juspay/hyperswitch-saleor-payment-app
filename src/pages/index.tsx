import { type NextPage } from "next";
import { useAppBridge } from "@saleor/app-sdk/app-bridge";
import { Box, Button, Text } from "@saleor/macaw-ui";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/router";
import { FormInput } from "@/modules/ui/atoms/macaw-ui/FormInput";

const schema = z
  .object({
    saleorUrl: z.string().url(),
  })
  .required();
type FormValues = z.infer<typeof schema>;

const AddToSaleorForm = () => {
  const formMethods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      saleorUrl: "",
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting, errors },
  } = formMethods;

  return (
    <FormProvider {...formMethods}>
      <form
        method="post"
        noValidate
        onSubmit={handleSubmit((values) => {
          const manifestUrl = new URL("/api/manifest", window.location.origin).toString();
          const redirectUrl = new URL(
            `/dashboard/apps/install?manifestUrl=${manifestUrl}`,
            values.saleorUrl,
          ).toString();

          window.open(redirectUrl, "_blank");
        })}
      >
        <Box display="flex" flexDirection="column" gap={2} marginTop={10}>
          <FormInput
            inputMode="url"
            label="Saleor URL"
            required
            name="saleorUrl"
            size="medium"
            placeholder="https://…"
            error={!!errors.saleorUrl}
            helperText={errors.saleorUrl?.message || " "}
            control={control}
          />
          <Button type="submit" size="large" disabled={isSubmitting}>
            Add to Saleor
          </Button>
        </Box>
      </form>
    </FormProvider>
  );
};

const CopyManifest = () => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsetCopied = () => {
      setCopied(false);
    };

    if (copied) {
      setTimeout(unsetCopied, 1750);
    }
  }, [copied]);

  const handleClick = async () => {
    await navigator.clipboard.writeText(window.location.origin + "/api/manifest");
    setCopied(true);
  };

  return (
    <Button variant="secondary" onClick={() => void handleClick()}>
      {copied ? "Copied" : "Copy app manifest URL"}
    </Button>
  );
};

const IndexPage: NextPage = () => {
  const { appBridgeState } = useAppBridge();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (appBridgeState?.ready && mounted) {
    void router.replace("/configurations/list");
    return null;
  }

  if (appBridgeState?.domain != "" && !appBridgeState?.ready) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        gap={2}
        placeItems="center"
        alignSelf="center"
        paddingY={20}
      >
        <Text as="h1" color="critical2" size={8}>
          Hey! Please reload the page
        </Text>
        <Text as="p">We were not able to detect the saleor dashboard</Text>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      gap={2}
      placeItems="center"
      alignSelf="center"
      paddingY={20}
    >
      <Text as="h1" size={11}>
        Welcome to Juspay Saleor Payment App 💰
      </Text>
      <Text as="p">
        Enable merchants to utilize secure and efficient payment processing from Juspay directly
        within their Saleor storefront,
      </Text>
      <Text>
        delivering a smooth and dependable checkout experience for customers both within India and
        globally.
      </Text>

      {!appBridgeState?.ready && (
        <>
          <div>
            <Text as="p">Install this app in your Saleor Dashboard to proceed!</Text>
            {mounted && <AddToSaleorForm />}
          </div>

          <CopyManifest />
        </>
      )}
    </Box>
  );
};

export default IndexPage;
