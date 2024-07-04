"use client";
import { Button, Text } from "@saleor/macaw-ui";
import { useAppBridge, withAuthorization } from "@saleor/app-sdk/app-bridge";
import { useRouter } from "next/router";
import { AppLayout } from "@/modules/ui/templates/AppLayout";
import { HyperswitchConfigurationForm } from "@/modules/ui/organisms/AddHyperswitchConfigurationForm/AddHyperswitchConfigurationForm";

import { usePathname } from "next/navigation";
import Link from "next/link";

const EditConfigurationPage = () => {
  const router = useRouter();
  if (typeof router.query.configurationId !== "string" || !router.query.configurationId) {
    // TODO: Add loading
    return <div />;
  }

  return (
    <AppLayout
      title="Hyperswitch > View configuration"
      description={
        <>
          <Text as="p" sizes="medium">
            View Hyperswitch configuration.
          </Text>
          <Text
            as="p"
            sizes="medium"
            backgroundColor={"buttonCriticalDisabled"}
            borderRadius={5}
            padding={2}
            __maxWidth={"60%"}
            placeItems={"center"}
          >
            <strong>Note: </strong>
            <Link href={"https://docs.hyperswitch.io/hyperswitch-cloud/webhooks"} legacyBehavior>
              <Text
                as="a"
                size={4}
                color="accent1"
                textDecoration="none"
                display="inline-flex"
                alignItems="center"
                paddingX={1}
              >
                Please configure your Hyperswitch webhook
              </Text>
            </Link>
            to the following endpoint:
            <br></br>
            <code>{window.location.origin}/api/webhooks/hyperswitch/authorization</code>
          </Text>
        </>
      }
    >
      <HyperswitchConfigurationForm configurationId={router.query.configurationId} />
    </AppLayout>
  );
};

export default withAuthorization()(EditConfigurationPage);
