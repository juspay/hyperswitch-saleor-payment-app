import { Box, Text } from "@saleor/macaw-ui";
import { useRouter } from "next/router";
import { useAppBridge } from "@saleor/app-sdk/app-bridge";
import { RoundedBoxWithFooter } from "../../atoms/RoundedActionBox/RoundedActionBox";
import { ConfirmationButton } from "../../molecules/ConfirmationButton/ConfirmationButton";
import { trpcClient } from "@/modules/trpc/trpc-client";
import { getErrorHandler } from "@/modules/trpc/utils";

export const DeleteHyperswitchConfigurationForm = ({
  configurationId,
  configurationName,
}: {
  configurationId: string | null | undefined;
  configurationName: string;
}) => {
  const context = trpcClient.useContext();
  const router = useRouter();
  const { appBridge } = useAppBridge();

  const { mutateAsync: deleteConfig } =
    trpcClient.paymentAppConfigurationRouter.paymentConfig.delete.useMutation({
      onError: (err) => {
        getErrorHandler({
          appBridge,
          actionId: "DeleteHyperswitchConfigurationForm",
          message: "Error while deleting configuration",
          title: "Error",
        })(err);
      },
    });

  const handleConfigDelete = async () => {
    if (!configurationId) {
      return;
    }
    await deleteConfig({ configurationId });
    await router.replace("/configurations/list");
    await context.paymentAppConfigurationRouter.invalidate();
  };

  return (
    <RoundedBoxWithFooter
      error={true}
      footer={
        <Box display="flex" flexDirection="row" width="100%">
          <ConfirmationButton
            configurationName={configurationName}
            onClick={handleConfigDelete}
            variant="error"
            size="medium"
          >
            Delete configuration
          </ConfirmationButton>
        </Box>
      }
    >
      <form method="POST">
        <Box paddingBottom={6} rowGap={6} display="flex" flexDirection="column">
          <Text as="h3" sizes="medium">
            Remove configuration
          </Text>
          <Box display="flex" flexDirection="column" rowGap={5}>
            <Text as="p" sizes="medium">
              You can remove the configuration{" "}
              <Text as="strong" sizes="medium">
                {configurationName}
              </Text>
            </Text>
            <Text as="p" sizes="medium">
              This operation will permanently remove all settings related to this configuration and
              disable Hyperswitch in all assigned channels.
            </Text>
            <Text as="p" sizes="medium">
              This operation cannot be undone.{" "}
            </Text>
          </Box>
        </Box>
      </form>
    </RoundedBoxWithFooter>
  );
};
