import { Text } from "@saleor/macaw-ui";
import { withAuthorization } from "@saleor/app-sdk/app-bridge";
import { AppLayout } from "@/modules/ui/templates/AppLayout";
import { ConfigurationForm } from "@/modules/ui/organisms/AddHyperswitchConfigurationForm/AddConfigurationForm";

const AddConfigurationPage = () => {
  return (
    <AppLayout
      title="Hyperswitch > Add configuration"
      description={
        <>
          <Text as="p" sizes="medium">
            Create new Hyperswitch configuration.
          </Text>
        </>
      }
    >
      <ConfigurationForm configurationId={undefined} orchestra="hyperswitch" />
    </AppLayout>
  );
};

export default withAuthorization()(AddConfigurationPage);
