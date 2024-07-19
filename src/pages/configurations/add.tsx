import { Text } from "@saleor/macaw-ui";
import { withAuthorization } from "@saleor/app-sdk/app-bridge";
import { AppLayout } from "@/modules/ui/templates/AppLayout";
import { HyperswitchConfigurationForm } from "@/modules/ui/organisms/AddHyperswitchConfigurationForm/AddHyperswitchConfigurationForm";

const AddConfigurationPage = () => {
  return (
    <AppLayout
      title="Hyperswitch > Add configuration"
      description={
        <>
          <Text as="p" sizes="medium">
            Create new Hyperswitch configuration.
          </Text>
          <Text as="p" sizes="medium">
            Hyperswitch Webhooks will be created automatically.
          </Text>
        </>
      }
    >
      <HyperswitchConfigurationForm configurationId={undefined} />
    </AppLayout>
  );
};

export default withAuthorization()(AddConfigurationPage);
