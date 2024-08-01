import { Button, Box } from "@saleor/macaw-ui";
import { type SubmitHandler, useFormContext } from "react-hook-form";
import { useCallback, useEffect } from "react";
import { useAppBridge } from "@saleor/app-sdk/app-bridge";
import { useRouter } from "next/router";
import { RoundedBoxWithFooter } from "../../atoms/RoundedActionBox/RoundedActionBox";
import { FormInput } from "@/modules/ui/atoms/macaw-ui/FormInput";
import { trpcClient } from "@/modules/trpc/trpc-client";
import { getErrorHandler, getFieldErrorHandler, getFormFields } from "@/modules/trpc/utils";
import { invariant } from "@/lib/invariant";
import { config } from "../../../../pages/api/webhooks/saleor/payment-gateway-initialize-session";
import { PaymentAppFormConfigEntry } from "@/modules/payment-app-configuration/common-app-configuration/config-entry";

const actionId = "payment-form";

export const AddJuspayCredentialsForm = ({
  configurationId,
}: {
  configurationId?: string | undefined | null;
}) => {
  const formMethods = useFormContext<PaymentAppFormConfigEntry>();
  const { appBridge } = useAppBridge();
  const router = useRouter();

  const context = trpcClient.useContext();

  const {
    handleSubmit,
    reset,
    setError,
    control,
    formState: { defaultValues },
  } = formMethods;

  const { data: juspayConfigurationData } =
    trpcClient.paymentAppConfigurationRouter.paymentConfig.get.useQuery(
      { configurationId: configurationId! },
      {
        enabled: !!configurationId,
        onError: (err) => {
          getErrorHandler({
            appBridge,
            actionId,
            message: "Error while fetching initial form data",
            title: "Form error",
          })(err);
        },
      },
    );

  useEffect(() => {
    if (juspayConfigurationData) {
      reset(juspayConfigurationData);
    }
  }, [juspayConfigurationData, reset]);

  const getOnSuccess = useCallback(
    (message: string) => {
      return () => {
        void appBridge?.dispatch({
          type: "notification",
          payload: {
            title: "Form saved",
            text: message,
            status: "success",
            actionId,
          },
        });
        void context.paymentAppConfigurationRouter.paymentConfig.invalidate();
      };
    },
    [appBridge, context.paymentAppConfigurationRouter.paymentConfig],
  );

  const onError = getFieldErrorHandler({
    appBridge,
    setError,
    actionId,
    fieldName: "root",
    formFields: getFormFields(defaultValues),
  });

  const { mutate: updateConfig } =
    trpcClient.paymentAppConfigurationRouter.paymentConfig.update.useMutation({
      onSuccess: (data) => {
        invariant(data.configurationId);
        getOnSuccess("App configuration was updated successfully")();
        return router.replace(`/configurations/edit/juspay/${data.configurationId}`);
      },
      onError,
    });
  const { mutate: addNewConfig } =
    trpcClient.paymentAppConfigurationRouter.paymentConfig.add.useMutation({
      onSuccess: async (data) => {
        invariant(data.configurationId);
        context.paymentAppConfigurationRouter.paymentConfig.get.setData(
          { configurationId: data.configurationId },
          data,
        );
        if (!configurationId) {
          await router.replace(`/configurations/edit/juspay/${data.configurationId}`);
        }
      },
      onError,
    });

  const handleConfigSave: SubmitHandler<PaymentAppFormConfigEntry> = (data) => {
    {
      configurationId
        ? updateConfig({
            configurationId,
            entry: data,
          })
        : addNewConfig(data);
    }
  };
  const secretInputType = configurationId ? "text" : "password";

  return (
    <RoundedBoxWithFooter
      as="form"
      method="POST"
      autoComplete="off"
      onSubmit={handleSubmit(handleConfigSave)}
      footer={
        <Box flexDirection="row" columnGap={4} display={configurationId ? "none" : "flex"}>
          <Button variant="primary" size="medium" type="submit">
            Save Configuration
          </Button>
        </Box>
      }
    >
      <Box paddingBottom={6} rowGap={4} display="flex" flexDirection="column" width="100%">
        <FormInput
          control={control}
          label="Configuration name"
          helperText="Enter configuration name that uniquely identifies this configuration. This name will be used later to assign configuration to Saleor Channels."
          name="configurationName"
          autoComplete="off"
          size="medium"
        />
        <FormInput
          control={control}
          type={secretInputType}
          autoComplete="off"
          label="API Key"
          helperText="API key you got from juspay dashboard."
          name="juspayConfiguration.apiKey"
          size="medium"
        />
        <FormInput
          control={control}
          type={secretInputType}
          autoComplete="off"
          label="Merchant ID"
          helperText="Merchant ID for which you are adding configuration."
          name="juspayConfiguration.merchantId"
          size="medium"
        />
        <FormInput
          control={control}
          autoComplete="off"
          label="Username"
          helperText="Username from your juspay dashboard setting for webhook."
          name="juspayConfiguration.username"
          size="medium"
        />
        <FormInput
          control={control}
          type={secretInputType}
          autoComplete="off"
          label="Passowrd"
          helperText="Passowrd from your juspay dashboard setting for webhook."
          name="juspayConfiguration.password"
          size="medium"
        />
        <FormInput
          control={control}
          autoComplete="off"
          label="Client ID"
          helperText="ClientId for which you are adding configuration."
          name="juspayConfiguration.clientId"
          size="medium"
        />
        <div hidden={true}>
          <FormInput
            control={control}
            name="hyperswitchConfiguration"
            size="medium"
            value={undefined}
          />
        </div>
      </Box>
    </RoundedBoxWithFooter>
  );
};
