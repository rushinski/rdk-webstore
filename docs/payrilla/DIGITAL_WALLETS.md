# Digital Wallets

# **Google Pay™ Web Integration**

By using Google Pay, you agree to all Google Pay terms and conditions. See the following links for more information:

[Acceptable Use Policy](https://payments.developers.google.com/terms/aup)

[Google Pay API Terms of Service](https://payments.developers.google.com/terms/sellertos)

The following card brands are supported with Google Pay:

- Amex
- MasterCard
- Discover
- JCB
- Visa

### **Integration steps:**

1. **Set up the merchant account**
    
    To use Google Pay, you must first register as a merchant with Google Pay. To setup a merchant account, visit the [Google Pay and Wallet Console](https://pay.google.com/business/console).
    
    Once you have set up your merchant account with Google Pay, you will need your merchant ID. To learn how to find your merchant ID, visit [this page](https://support.google.com/paymentscenter/answer/7163092?hl=en).
    
2. **Adding Google Pay**
    
    Follow the [Google Pay Web documentation](https://developers.google.com/pay/api/web/overview) to add a Google Pay button to your web page.
    
    The following authentication methods are supported for the `allowedAuthMethods` field in the [Card Parameters](https://developers.google.com/pay/api/web/reference/request-objects#CardParameters) object:
    
    - `"PAN_ONLY"` (3DS is not currently supported when using `"PAN_ONLY"`)
    - `"CRYPTOGRAM_3DS"`
    
    You can require your customers to add billing info in the [Card Parameters](https://developers.google.com/pay/api/web/reference/request-objects#CardParameters) object by setting the `billingAddressRequired` and `billingAddressParameters` fields.
    
    ```
    {
      "billingAddressRequired": true
      "billingAddressParameters": {
        "format": "FULL",
        "phoneNumberRequired": false
      }
    }
    ```
    
    When building the [`MerchantInfo`](https://developers.google.com/pay/api/web/reference/request-objects#MerchantInfo) object, set `merchantId` to your Google Pay merchant ID obtained in step 1.
    
    ```
    {
      "merchantInfo": {
        "merchantId": "12345"
      }
    }
    ```
    
    When building the [`TokenizationSpecification`](https://developers.google.com/pay/api/web/reference/request-objects#PaymentMethodTokenizationSpecification) object, set `gateway` to `"acceptblue"`, and `gatewayMerchantId` to your uniquely generated Google Pay Gateway Merchant ID.
    
    To find your Google Pay key, navigate to the Control Panel page in your merchant portal, and choose the Digital Wallet option. Then scroll to the Google Pay section. Your Google Pay Gateway Merchant ID will be displayed. This ID is unique to you, and will not change.
    
    ```
    {
      "tokenizationSpecification": {
        "type": "PAYMENT_GATEWAY",
        "parameters": {
          "gateway": "acceptblue",
          "gatewayMerchantId": "GOOGLE_PAY_GATEWAY_MERCHANT_ID_HERE"
        }
      }
    }
    ```
    
    You can use the [Google Pay Web integration checklist](https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist) to help you build the integration.
    
    All integrations must comply with the [Google Pay Web Brand Guidelines](https://developers.google.com/pay/api/web/guides/brand-guidelines) .
    
3. **Handling the Google Pay payload**
    
    When the customer uses your page to check out with Google Pay, Google Pay will issue a [`PaymentData`](https://developers.google.com/pay/api/web/reference/response-objects#PaymentData) response object that includes encrypted data containing the payment data. The encrypted data can be extracted from the `paymentMethodData.tokenizationData` property of the `PaymentData` response object.
    
4. **Submitting the charge request**
    
    Validate the charge request and amount on your backend. Then, create a [Digital Wallet Charge](https://docs.payrillagateway.com/api/v2#tag/processing-charges/paths/~1transactions~1charge/post) request object containing the encrypted payload obtained from Google Pay. The `source` field should be set to `"googlepay"`, and the encrypted data should be passed in the `token` field.
    
    **Note**: The encrypted data only contains the information needed to process a charge using the customer's saved wallet. You will still need to supply the charge amount and any billing information, if applicable.
    
    ```
    {
      "amount": 1.5,
      "source": "googlepay",
      "token": "examplePaymentMethodToken",
      "avs_zip": "12345",
      "avs_address": "123 Main St."
    }
    ```
    
    Finally, submit request to the gateway using the [/charge endpoint](https://docs.payrillagateway.com/api/v2#tag/processing-charges/paths/~1transactions~1charge/post) .
    
    ```
    curl --request POST \
      --url API_DOMAIN/api/v2/transactions/charge \
      --user 'API_KEY:API_KEY_PIN' \
      --header 'Content-Type: application/json' \
      --data '{
        "amount": 1.5,
        "source": "googlepay",
        "token": "examplePaymentMethodToken",
        "avs_zip": "12345",
        "avs_address": "123 Main St."
      }'
    ```
    

# **Apple Pay™ Web Integration**

By using Apple Pay, you agree to all Apple Pay terms and conditions. See the following links for more information:

[Acceptable Use Policy](https://developer.apple.com/apple-pay/acceptable-use-guidelines-for-websites/)

[Apple Developer Program License Agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)

### **Integration steps:**

For an overview of the integration process, and an explanation of the terms used, see [this page](https://developer.apple.com/documentation/apple_pay_on_the_web/configuring_your_environment).

1. **Set up the merchant account**
    
    To use Apple Pay, you must first register in the Apple Pay developer program. You can register for an account [here](https://developer.apple.com/account/).
    
    Once you have set up your developer account with Apple Pay, you will need to create a merchant identifier. To learn how to create a merchant identifier, visit [this page](https://developer.apple.com/help/account/configure-app-capabilities/configure-apple-pay#create-a-merchant-identifier).
    
    If you are using Apple Pay on the web, you will need to register a merchant domain. To learn how to verify your domain, visit [this page](https://developer.apple.com/help/account/configure-app-capabilities/configure-apple-pay-on-the-web).
    
2. **Configure Apple Pay settings**
    1. Next, navigate to the Control Panel page in your gateway merchant portal, and choose the Digital Wallet option. Then scroll to the Apple Pay section. Enter your merchant identifier in the box as shown.
        
        **NOTE:** To use the same merchant identifier with multiple gateway merchant accounts, enter your existing merchant identifier and skip to step e.
        
        ![A textbox to enter the Apple Pay Merchant ID.](https://docs.payrillagateway.com/assets/enter_merch_id.cb2fe684.png)
        
        Click **NEXT**.
        
    2. On the next screen, download the Merchant ID signing request and the Payment Processing signing request files.
        
        ![Buttons to download the Merchant ID signing request and the Payment Processing signing request files](https://docs.payrillagateway.com/assets/dnload_certs.39ace875.png)
        
    3. Go back to the Apple Pay portal. Navigate to the [Certificates, Identifiers & Portals page](https://developer.apple.com/account/resources/identifiers/list/merchant).
        
        Select your Merchant Identifier. Under the Apple Pay Payment Processing Certificate heading, click **Create Certificate**.
        
        ![Instructions and a button to create an Apple Pay Payment Processing Certificate.](https://docs.payrillagateway.com/assets/ap_proc_cert.52ceedaa.png)
        
        In the Create a New Certificate page, click **Choose File**.
        
        ![A button to upload a Certificate Signing Request file.](https://docs.payrillagateway.com/assets/choose_cert.d83478c0.png)
        
        Select the Payment Processing signing request file you downloaded in the step above. The file will be named **Payment Processing.csr**.
        
        Click **Continue**.
        
    4. Repeat step **c**, this time choosing Apple Pay Merchant Identity Certificate.
        
        ![A button to upload an Apple Pay Merchant Identity Certificate.](https://docs.payrillagateway.com/assets/merch_id_cert.dbd44c8c.png)
        
        Now upload the Merchant ID signing request file. The file will be named **Merchant Id.csr**.
        
        Click **Continue**.
        
    5. In the next screen, click **Download** to download your Merchant Id certificate.
        
        ![The certificate details, with buttons to revoke or download the certificate.](https://docs.payrillagateway.com/assets/dload_merch_cert.01aabd2d.png)
        
        The file will be named **merchant_id.cer**.
        
    6. Return to the gateway merchant portal.
        
        Click **NEXT**.
        
        Click **Upload** to upload the Merchant Id Certificate downloaded from the Apple Pay developer portal.
        
        ![A button to upload the Merchant Id Certificate.](https://docs.payrillagateway.com/assets/upload_merch_cert.fe81b49d.png)
        
    7. You are now ready to process with Apple Pay.
        
        ![A message saying 'You are registered to use Apple Pay!'](https://docs.payrillagateway.com/assets/success_msg.941424d2.png)
        
3. **Using Apple Pay**
    
    Familiarize yourself with Apple Pay guidelines for branding. Use the following links as a starting point.
    
    - [Apple Pay Marketing Guidelines](https://developer.apple.com/apple-pay/marketing/)
    - [Apple Pay UI Guidelines](https://developer.apple.com/design/human-interface-guidelines/apple-pay)
    
    Ensure your site is hosted on a verified domain. Follow the instructions on [this page](https://developer.apple.com/documentation/apple_pay_on_the_web/displaying_apple_pay_buttons_using_javascript) to add an Apple Pay button to your site.
    
    Build your payment flow using the Apple Pay APIs. Begin by creating an Apple Pay session. See below for an example session object.
    
    ```
    const request = {
      countryCode: 'US',
      currencyCode: 'USD',
      supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
      merchantCapabilities: ['supports3DS'],
      total: { label: 'Your Merchant Name', amount: '10.00' },
    }
    const session = new ApplePaySession(3, request);
    ```
    
    Add an event handler to the session object for the `onvalidatemerchant` event. Use our gateway API to create a session, passing the `validationURL` parameter received from the event. The documentation for our Apple Session endpoint can be found [here](https://docs.payrillagateway.com/api/v2#tag/apple-session/paths/~1apple-pay~1session/post).
    
    **Note**: this endpoint requires a public source key.
    
    If the merchant account was boarded properly, you should receive a valid Apple Session in the response. Pass the response body directly to the session's `completeMerchantValidation` method.
    
    **Note**: the session is only valid for 5 minutes.
    
    See below for a full example.
    
    ```
    session.onvalidatemerchant = async function (event) {
      try {
        const baseURL = 'APPLE_SESSION_API_ENDPOINT'; // Use the endpoint obtained from the gateway docs
        const response = await fetch(baseURL, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${MY_PUBLIC_API_KEY}:`).toString('base64')}`,
          },
        });
        const appleSession = await response.json();
        session.completeMerchantValidation(appleSession);
      } catch (e) {
        session.abort();
        console.error('Could not get an Apple Pay session');
      }
    }
    ```
    
4. **Completing Checkout**
    
    At this point, the payment flow will display the Apple Pay payment options to the customer. The customer will complete the checkout with Apple Pay. When the customer clicks the Pay button, it will trigger the `onpaymentauthorized` event. You must handle this event, as shown in the example below.
    
    ```
    session.onpaymentauthorized = async function (event) {
      // Add handling logic here to send the encrypted payload to your back-end server
    }
    ```
    
    The event object will contain an encrypted Apple Pay payload.
    
    ```
    // event object structure
    {
      "payment": {
        "token": {
          "paymentData": "ENCRYPTED_PAYLOAD"
        }
      }
    }
    ```
    
5. **Submitting the charge request**
    
    Validate the charge request and amount on your backend. Then, create a [Digital Wallet Charge](https://docs.payrillagateway.com/api/v2#tag/processing-charges/paths/~1transactions~1charge/post) request object containing the encrypted payload obtained from Apple Pay. The `source` field should be set to `"applepay"`, and the encrypted data should be passed in the `token` field.
    
    **Note**: The encrypted data only contains the information needed to process a charge using the customer's saved wallet. You will still need to supply the charge amount and any billing information, if applicable.
    
    Sample API request body:
    
    ```
    {
      "amount": 1.5,
      "source": "applepay",
      "token": "ENCRYPTED_PAYLOAD",
      "avs_zip": "12345",
      "avs_address": "123 Main St."
    }
    ```
    
    Finally, submit request to the gateway using the [/charge endpoint](https://docs.payrillagateway.com/api/v2#tag/processing-charges/paths/~1transactions~1charge/post).
    
    Sample curl request:
    
    ```
    curl --request POST \
      --url API_DOMAIN/api/v2/transactions/charge \
      --user 'API_KEY:API_KEY_PIN' \
      --header 'Content-Type: application/json' \
      --data '{
        "amount": 1.5,
        "source": "applepay",
        "token": "ENCRYPTED_PAYLOAD",
        "avs_zip": "12345",
        "avs_address": "123 Main St."
      }'
    ```