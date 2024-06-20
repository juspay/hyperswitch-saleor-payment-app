import { Text } from "@saleor/macaw-ui";
import { withAuthorization } from "@saleor/app-sdk/app-bridge";
import { useRouter } from "next/router";
import { AppLayout } from "@/modules/ui/templates/AppLayout";
import { HyperswitchConfigurationForm } from "@/modules/ui/organisms/AddHyperswitchConfigurationForm/AddHyperswitchConfigurationForm";

const EditConfigurationPage = () => {
  const router = useRouter();
  if (typeof router.query.configurationId !== "string" || !router.query.configurationId) {
    // TODO: Add loading
    return <div />;
  }

  return (
    <AppLayout
      title="Hyperswitch > Edit configuration"
      description={
        <>
          <Text as="p" sizes="medium">
            Edit Hyperswitch configuration.
          </Text>
          <Text as="p"sizes="medium">
            Note: Hyperswitch Webhooks will be created automatically.
          </Text>
        </>
      }
    >
      <HyperswitchConfigurationForm configurationId={router.query.configurationId} />
    </AppLayout>
  );
};

export default withAuthorization()(EditConfigurationPage);
