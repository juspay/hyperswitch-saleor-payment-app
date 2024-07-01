"use client"
import { Text } from "@saleor/macaw-ui";
import { useAppBridge, withAuthorization } from "@saleor/app-sdk/app-bridge";
import { useRouter } from "next/router";
import { AppLayout } from "@/modules/ui/templates/AppLayout";
import { HyperswitchConfigurationForm } from "@/modules/ui/organisms/AddHyperswitchConfigurationForm/AddHyperswitchConfigurationForm";


import { usePathname } from 'next/navigation'


const EditConfigurationPage = () => {
  const router = useRouter();
  if (typeof router.query.configurationId !== "string" || !router.query.configurationId) {
    // TODO: Add loading
    return <div />;
  }

  console.log(window.location.origin);
  return (
    <AppLayout
      title="Hyperswitch > View configuration"
      description={
        <>
          <Text as="p" sizes="medium">
            View Hyperswitch configuration.
          </Text>
          <Text as="p"sizes="medium" backgroundColor={"buttonCriticalDisabled"} borderRadius={5} padding={2} __maxWidth={"60%"} placeItems={"center"}>
          <strong>Note:</strong>  Please configure your Hyperswitch webhook to the following endpoint:
          <br></br><code>{window.location.origin}/api/webhooks/hyperswitch/authorization</code>
          </Text>
        </>
      }
    >
      <HyperswitchConfigurationForm configurationId={router.query.configurationId} />
    </AppLayout>
  );
};

export default withAuthorization()(EditConfigurationPage);
