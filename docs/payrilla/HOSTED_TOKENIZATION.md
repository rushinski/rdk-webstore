# Hosted Tokenization

The PayRilla Hosted Tokenization library allows your app to process credit card transactions, while still minimizing scope for PCI.

You can use the library to create iframes containing card fields, generate a nonce token from the card data, and then use that nonce token to process transactions. Since the iframes and card fields are hosted completely on the gateway's servers, your app never deals with the raw card data, and the scope for PCI is minimized.

## **Setup**

### **Processing**

Before starting, create a tokenization source key in the gateway. This type of source key can only be used for tokenization using this library, and can be used in the frontend of a website.To create a source key in the gateway, navigate to Control Panel > Sources > Create Key, and choose "Tokenization" from the Source Key Type dropdown.

1. Add the hosted tokenization library to the page (for production, use the production base domain):
    
    ```
                  <script src="https://tokenization.sandbox.payrillagateway.com/tokenization/v0.3"></script>
    ```
    
2. Initialize the library using a tokenization source key and the desired options:
    
    ```
                  const tokenizationSourceKey = 'pk_abc123';
                  const options = { target: '#my-div' };
                  const hostedTokenization = new window.HostedTokenization(tokenizationSourceKey, options);
    ```
    
3. When the user is ready to submit the transaction (e.g. they click a Process button), request the data from the fields, including a nonce token:
    
    ```
                  const result = await hostedTokenization.getNonceToken();
    ```
    
4. Or, prompt the user to swipe their card. This function will return a promise which will be resolved when a successful swipe is completed. If the modal is cancelled, the promise will be rejected with `'cancelled'`:
    
    ```
                  const result = await hostedTokenization.getSwipe();
    ```
    

```
getNonceToken()
```

```
getSwipe()
```

1. On the backend, make an API request using the above data:(This example shows NodeJS / JavaScript, but should be replaced with similar code in whichever language is being used in your backend).
    
    ```
                  const { amount, name, result } = req.body;
    
                  const data = {
                    source: `nonce-${result.nonce}`,
                    amount,
                    name,
                    expiry_month: result.expiry_month,
                    expiry_year: result.expiry_year,
                    avs_zip: result.avs_zip,
                  };
    
                  const config = {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Basic ${Buffer.from(`${MY_SOURCE_KEY}:${MY_PIN}`).toString('base64')}`,
                    },
                    body: JSON.stringify(data),
                  };
    
                  const url = 'https://api.sandbox.payrillagateway.com/v2/transactions/charge';
                  const res = await fetch(url, config);
                  const body = await res.json();
    ```
    

### **Additional options**

### **Listening for events**

To listen for events fired by the iframed fields, use the `.on()` method.This can be useful for showing the masked card data on a card widget as it's entered.

                `hostedTokenization.on('input', onEvent);`

### **Change the target and options**

To change the iframe target or other options, use the `.setOptions()` method.The options object structure is the same as the options passed upon initialization.

                `hostedTokenization.setOptions({
                  target: '#myOtherDiv',
                  showZip: false,
                });`

### **Styling the iframe and fields**

To style the iframe fields, use the `.setStyles()` method.The strings passed as the values will be set as the `style` attribute for each element.

                `hostedTokenization.setStyles({
                  card: 'border: 1px solid black',
                });`

You can also set the styling using the `.setOptions()` method.

                `hostedTokenization.setOptions({
                  styles: {
                    card: 'border: 1px solid black',
                  }
                });`

More styling options have been added, including static and hidden labels. See the [API Reference](https://docs.payrillagateway.com/tokenization/v0.3#api) for more details.

### **Multiple Instances**

Multiple instances of the library are fully supported. This can be useful for split payment scenarios, or even for a multi-MID setup.

```
            const apiKey1 = 'pk_abc123';
            const apiKey2 = 'pk_xyz456';
            const options1 = { target: '#my-div1' };
            const options2 = { target: '#my-div2' };
            const hostedTokenization1 = new window.HostedTokenization(apiKey1, options1);
            const hostedTokenization2 = new window.HostedTokenization(apiKey2, options2);
```

**Sample Code**

                
`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Hosted Tokenization Sample</title>
    <script src="https://tokenization.develop.accept.blue/tokenization/v0.3"></script>
  </head>
  <body>
    <form>
      <div>
        <div>
          <label>Name<br/><input id="name" name="name" value="John Doe"/></label>
        </div>

        <div>
          <label>Amount<br/><input id="amount" name="amount" value="5"/></label>
        </div>
      </div>

      <div id="iframe-container"></div>

      <div id="error-message"></div>

      <div>Masked Card #: <span id="masked-card"></span></div>
      <div>Masked CVV2: <span id="masked-cvv2"></span></div>

      <div>
        <button type="button" id="charge">Charge</button>
      </div>
    </form>

    <script defer>
      const chargeButton = document.querySelector('#charge');
      const nameEl = document.querySelector('#name');
      const amountEl = document.querySelector('#amount');
      const iframeContainerEl = document.querySelector('#iframe-container');
      const errorMessageEl = document.querySelector('#error-message');
      const maskedCardEl = document.querySelector('#masked-card');
      const maskedCvv2El = document.querySelector('#masked-cvv2');

      chargeButton.addEventListener('click', onChargeClick);

      const publicSourceKey = 'PUBLIC_SOURCE_KEY_HERE';
      const options = {
        target: '#iframe-container'
      };
      const hostedTokenization = new window.HostedTokenization(publicSourceKey, options);

      hostedTokenization
          .on('input', _onEvent)
          .on('change', _onEvent);

      function _onEvent(event) {
        _handleError(event.error);
        maskedCardEl.innerText = (event.result?.maskedCard) || '';
        maskedCvv2El.innerText = (event.result?.maskedCvv2) || '';
      }
   </script>
  </body>
</html>`

### **3D Secure**

The Hosted Tokenization library is integrated with [Paay](https://www.paay.co/), allowing you to authenticate transactions with 3DS without directly handling card data.

1. Upon initialization of the Hosted Tokenization library, add a `threeDS` object containing your Paay API key to the `options` parameter.
    
    ```
                  const tokenizationSourceKey = 'pk_abc123';
                  const threeDS = { apiKey: 'paay_key_123' };
                  const options = { target: '#my-div', threeDS };
                  const hostedTokenization = new window.HostedTokenization(tokenizationSourceKey, options);
    ```
    
2. Call the `verify3DS()` method to run the 3DS verification with Paay.You can do this before you submit the transaction for processing, or you can listen to the card `input` events and authenticate as soon as a valid card number and expiration are entered.Paay has a [list of fields](https://docs.3dsintegrator.com/reference/post_v2-2-authenticate-browser) that can be sent for verification. The only fields set by the Hosted Tokenization library are: `browser`, `pan`, `month` and `year`. Additionally, the `challengeIndicator` field is set by the library based on the `frictionless` option passed upon initialization. The `amount` is required and must be set by you when calling `verify3DS()`. All other optional fields that you wish to send must be added.
    
    ```
                  const threeDsData = {
                    amount: 1.23,
                    billing: {
                      // ... billing fields
                    },
                    email: 'test@example.com',
                    // ... any additional optional Paay fields
                  }
                  const threeDSResult = await hostedTokenization.verify3DS(threeDsData);
    ```
    
3. The response will contain information about the transaction that you can use to decide whether to allow the transaction to be processed. You can then send this information to your backend and then on to the gateway for processing.
    
    ```
                  // Backend code
                  // This body would be the fields your frontend sends to your backend.
                  const { amount, name, result, threeDSResult } = req.body;
    
                  const data = {
                    source: `nonce-${result.nonce}`,
                    amount,
                    name,
                    '3d_secure': {
                      eci: threeDSResult.eci,
                      cavv: threeDSResult.authenticationValue,
                      ds_trans_id: threeDSResult.dsTransId,
                    },
                    expiry_month: result.expiry_month,
                    expiry_year: result.expiry_year,
                    avs_zip: result.avs_zip,
                  };
    
                  const config = {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Basic ${Buffer.from(`${MY_SOURCE_KEY}:${MY_PIN}`).toString('base64')}`,
                    },
                    body: JSON.stringify(data),
                  };
    
                  const url = 'https://api.sandbox.payrillagateway.com/v2/transactions/charge';
                  const res = await fetch(url, config);
                  const body = await res.json();
    ```
    

### **Challenge window**

If the 3DS verification process requires the customer to complete a challenge, the library will emit a `'challenge'` event. You can listen to this event to perform further customization.

                `hostedTokenization.on('challenge', onEvent);`

To forcibly close the challenge window, call the `cancel3DS()` method. Note: this will cause the transaction to be considered non-authenticated.

                `hostedTokenization.cancel3DS();`

If you prefer to prevent a challenge from being requested, you can set the `frictionless` option. Note: if the 3DS verification process requests a challenge, it will be rejected, and the transaction will be considered non-authenticated. Alternately, you can set a timeout after which the challenge will be automatically aborted.

                `const tokenizationSourceKey = 'pk_abc123';
                const threeDS = {
                  apiKey: 'paay_key_123',
                  frictionless: true,
                  timeout: 30 * 1000 // milliseconds
                };
                const options = { target: '#my-div', threeDS };
                const hostedTokenization = new window.HostedTokenization(tokenizationSourceKey, options);`

### **Migration Guide from v0.2**

Hosted Tokenization v0.3 has been completely redesigned, offering a simpler, cleaner interface and many added features. If you are already using v0.2, read on for a list of breaking changes and migration steps.

- The biggest change is that all methods now live on the `HostedTokenization` instance, and there are no longer any `CardForm` or `Swipe` objects. Card and swipe forms will be automatically created upon initialization. All of the methods from the `CardForm` or `Swipe` objects have been moved to the `HostedTokenization` instance.So instead of instantiating the library, creating a `CardForm`, and then mounting it to the DOM:You can now do this in a single step:Swipe is also now triggered from the `HostedTokenization` instance.If the `HostedTokenization` instance is created without a target, only swipe functionality will be enabled.See the table below for comparison of the original methods and new methods:
    
    ```
                    // v0.2
                    const tokenizationSourceKey = 'pk_abc123';
                    const hostedTokenization = new window.HostedTokenization(tokenizationSourceKey);
                    const cardForm = hostedTokenization.create('card-form');
                    cardForm.mount('#my-div');
    
                    // ...
    
                    const result = await cardForm.getNonceToken();
    ```
    
    ```
                    // v0.3
                    const tokenizationSourceKey = 'pk_abc123';
                    const options = { target: '#my-div' };
                    const hostedTokenization = new window.HostedTokenization(tokenizationSourceKey, options);
    
                    // ...
    
                    const result = await hostedTokenization.getNonceToken();
    ```
    
    ```
                    // v0.3
                    const result = await hostedTokenization.getSwipe();
    ```
    
    | **Function** | **Old Method** | **New Method** |
    | --- | --- | --- |
    | Instantiation | `new window.HostedTokenization(apiKey);` | `new window.HostedTokenization(apiKey, options);` |
    | Form Creation | `hostedTokenization.create();` | N/A |
    | Card Form mounting | `cardForm.mount('#my-div');` | Handled upon instantiation with the `target` option |
    | Event handling | `cardForm.on('input', onEvent);` | `hostedTokenization.on('input', onEvent);` |
    | Styling | `cardForm.setStyles(styles);` | `hostedTokenization.setStyles(styles);` |
    | Resetting | `cardForm.resetForm();` | `hostedTokenization.resetForm();` |
    | Destroy | `form.destroy();` | `hostedTokenization.destroy();` |
    | Get nonce | `cardForm.getNonceToken();` | `hostedTokenization.getNonceToken();` |
    | Get data | `cardForm.getData();` | `hostedTokenization.getData();` |
    | Get swipe | `swipeForm.getSwipe();` | `hostedTokenization.getSwipe();` |
- Styling can be done upon initialization, or afterward, using the `setStyles()` or `setOptions()` methods:
    
    ```
                    // v0.3
                    const styles = {
                      card: 'border: 1px solid black',
                    };
    
                    // at initialization
                    const tokenizationSourceKey = 'pk_abc123';
                    const options = { target: '#my-div', styles };
                    const hostedTokenization = new window.HostedTokenization(tokenizationSourceKey, options);
    
                    // using setStyles
                    hostedTokenization.setStyles(styles);
    
                    // using setOptions
                    hostedTokenization.setOptions({ styles });
    ```
    
- All inputs now have a border around them by default. This can be overridden with custom styles.
- The behavior of the `floatingLabelsPlaceholder` and `labels` options were incorrectly reversed when using floating labels, and have now been fixed. The styles from `floatingLabelsPlaceholder` will be used when the labels are being used as a placeholder, and `labels` will be used when they are floating outside the input and for static labels.
- A new function, `setOptions()` has been added which will allow you to modify the iframe target, styling or other parameters dynamically.You can also use this function to recreate an iframe that has been deleted from the DOM.In v0.2, this would have required re-creating the `cardForm` object using the `create()` and `mount()` methods.
    
    ```
                      // v0.3
                      const options = {
                        styles: {},
                        target: '#new-target',
                        showZip: true,
                        requireCvv2: false
                      }
                      hostedTokenization.setOptions(options);
    ```
    
- Supported options have changed as well. `zip` has been renamed to `showZip`.These options must be passed upon instantiation or using the `setOptions()` method.
    
    ```
                    // v0.2
                    const options = { zip: true };
                    cardForm.mount('#my-div', options);
    
                    // v0.3
                    const options = { showZip: true };
                    const hostedTokenization = new window.HostedTokenization(apiKey, options);
    
                    // Or:
                    const options = { showZip: true };
                    hostedTokenization.setOptions(options);
    ```
    
- Surcharge is not returned with the `getNonceToken()` method. Instead, you must make a separate call to the `getSurcharge()` method. This allows you to get the surcharge data before requesting a nonce token.
    
    ```
                    // v0.2
                    const { nonce, binType, surcharge } = await cardForm.getNonceToken();
    
                    // v0.3
                    const { surcharge, binType } = await hostedTokenization.getSurcharge();
                    const nonce = await hostedTokenization.getNonceToken();
    ```
    
- Support for older browsers, including Internet Explorer, has been dropped.

## **API**

### **`HostedTokenization`**

### **constructor(sourceKey: string, options?: HostedTokenizationOptions)**

This initializes the library with a source key.

`sourceKey` must be a tokenization source key (begins with `pk_`).

### **on(eventType: 'challenge', handler: ({ visible: boolean }) => void): HostedTokenization**

Binds an event handler to a 3DS event.

Currently, only `challenge` is supported.

Only one handler per event type is supported. When a handler is set, it will overwrite any previous handler set for that event type.

Returns the `HostedTokenization` instance for chaining.

### **on(eventType: 'input' | 'change', handler: ({ error: Error, result: DataResult }) => void): HostedTokenization**

Binds an event handler to an event. This can be useful for showing the masked card data on a card widget as it's entered.

Only one handler per event type is supported. When a handler is set, it will overwrite any previous handler set for that event type.

Returns the `HostedTokenization` instance for chaining.

### **on(eventType: 'ready', handler: () => void): HostedTokenization**

Binds an event handler to the `ready` event. This event is emitted when the iframe is finished initializing.

Only one handler per event type is supported. When a handler is set, it will overwrite any previous handler set for that event type.

Returns the `HostedTokenization` instance for chaining.

### **setStyles(styles: CardFormStyles): HostedTokenization**

Sets styles for the elements in the iframe.

The strings passed as the values will be set as the `style` attribute for each element.

Returns the `HostedTokenization` instance for chaining.

### **setOptions(options: HostedTokenizationOptions): HostedTokenization**

Dynamically change the options for the HostedTokenization instance.

The option object has the same structure as the one passed upon initialization.

Any options previously set will be kept unless overwritten.

Returns the `HostedTokenization` instance for chaining.

### **getNonceToken(): Promise<CardFormResult>**

Requests a nonce token for the data in the form. The promise will be rejected if the data is not valid.

The nonce token must be used within 15 minutes of when it was generated.

### **getSurcharge(): Promise<SurchargeResult>**

Gets the surcharge settings and BIN type for the card entered in the form.

Surcharge info will only be returned if a mandatory surcharge is set by the ISO/MSP.

### **getData(): Promise<{error: any, result: DataResult}>**

Requests the data from the iframe fields.

### **getSwipe(options: GetSwipeOptions): Promise<GetSwipeResult>**

Show the swipe modal.

If valid magstripe data is detected, the promise will be fulfilled with the results, including a nonce token.

The nonce token must be used within 15 minutes of when it was generated.

The promise will be rejected with a value of `'cancelled'` if the modal is cancelled.

### **resetForm(): HostedTokenization**

Resets the inputs and validation errors in the form.

Returns the `HostedTokenization` instance for chaining.

### **destroy(): void**

Destroys the Hosted Tokenization element.

### **verify3DS(data: ThreeDSData): Promise<ThreeDSResult>**

Run 3DS verification using the passed in data and the card form data.

Consult the [Paay documentation](https://docs.3dsintegrator.com/reference/post_v2-2-authenticate-browser) on the `authenticate` request for the structure of the `ThreeDSData` payload.

The `amount` field is required. The following fields will be overridden by the library: `browser`, `pan`, `month`, and `year`.

### **cancel3DS(): HostedTokenization**

Abort a 3DS challenge. You can use this in conjunction with the `challenge` event to suppress a challenge window.

Returns the `HostedTokenization` instance for chaining.

### **`HostedTokenizationOptions`**

### **showZip?: boolean = false**

Defaults to `false`. If set to `true`, the ZIP field will be shown and required.

### **requireCvv2?: boolean = true**

Defaults to `true`. If set to `false`, the CVV2 field will not be required.

### **styles?: CardFormStyles**

Sets styles for the elements in the iframe.

### **target?: string | Element**

Mounts the iframe to the specified element.

This must be set for the card iframe to be rendered. If not set, only swipe will be available.

### **threeDS?: ThreeDSOptions**

Options to initialize 3DS.

### **`ThreeDSOptions`**

### **apiKey: string**

Your Paay API Key.

### **frictionless?: boolean**

Specify if you wish to suppress any challenge window.

### **timeout?: number**

Fail the challenge after this timeout value. Leave blank to disable.

### **env?: 'test' | 'prod'**

Defaults to `'prod'`. Set this for test or production environments.

### **`ThreeDSResult`**

### **authenticationValue?: string**

This field maps to the `cavv` field in the `3d_secure` object of the charge request

**status: 'Y' | 'A' | 'N' | 'U' | 'C' | 'R'**

**eci: '00' | '01' | '02' | '05' | '06' | '07'**

**protocolVersion: string**

**acsTransId: string**

**dsTransId: string**

### **`DataResult`**

### **maskedCard: string**

The card number masked with `*`, besides for the last 4 digits.

### **maskedCvv2: string**

The CVV2 masked with `*`.

### **cardType: string**

The card brand (e.g. Visa).

### **last4: string**

The last 4 digits of the card number.

### **expiryMonth: number**

The expiration month (1-12).

### **expiryYear: number**

The 4-digit expiration year.

### **avsZip: string**

The AVS Zip Code.

### **`CardFormResult`**

### **maskedCard: string**

The card number masked with `*`, besides for the last 4 digits.

### **maskedCvv2: string**

The CVV2 masked with `*`.

### **cardType: string**

The card brand (e.g. Visa).

### **last4: string**

The last 4 digits of the card number.

### **expiryMonth: number**

The expiration month (1-12).

### **expiryYear: number**

The 4-digit expiration year.

### **nonce: string**

The nonce token that can be used in place of the card number.

To use it in an API request, use the `source` field with the `nonce-` prefix.

The nonce token must be used within 15 minutes of when it was generated.

### **`SurchargeResult`**

### **surcharge: object | null**

This is the surcharge that will be automatically added to the amount submitted for this card.

If a surcharge value is returned, it should be calculated and displayed to the customer.

There is no need to send it back to the gateway with the processing request. It will be added automatically.

**type: 'percent' | 'currency'**

The type of the `value` field.

**value: number**

Surcharge value for this card.

### **binType: 'C' | 'D' | null**

Whether the card is a credit card (`C`), debit card (`D`), or unknown / N/A (`null`).

### **`CardFormStyles`**

**container?: string**

**card?: string**

**expiryContainer?: string**

**expiryMonth?: string**

**expirySeparator?: string**

**expiryYear?: string**

**cvv2?: string**

**avsZip?: string**

### **labels?: string**

These are the styles used for the labels when they are floating or static.

### **floatingLabelsPlaceholder?: string**

These are the styles used for floating labels when the input is empty and they're functioning as placeholders.

**labelType?: 'floating' | 'static-top' | 'static-left' | 'hidden'**

### **`GetSwipeOptions`**

### **extractCard?: boolean = false**

By default the magstripe is sent to the processor and the transaction is run as entry mode swiped.

Set this option to `true` to extract the card number from the magstripe and run the card as a key-in transaction.

### **`GetSwipeResult`**

### **nonce: string**

The nonce token to use in place of the card number.

### **maskedCard: string**

The card number masked with `*`, besides for the last 4 digits.

### **cardType: string**

The card brand (e.g. Visa).

### **last4: string**

The last 4 digits of the card number.

### **expiryMonth: number**

The expiration month (1-12).

### **expiryYear: number**

The 4-digit expiration year.

### **name: string**

The cardholder name, unchanged from how it's encoded in the magstripe.