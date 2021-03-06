# strider-aws-codedeploy
Use this plugin to integrate 
[AWS CodeDeploy](http://docs.aws.amazon.com/codedeploy/latest/userguide/)
into your 
[Strider CD](https://github.com/Strider-CD/strider) server. The plugin is published under the MIT license.


## Requirements
This plugin uses some of the new ES6-features. One should therefore use node v4.x or above. This causes an issue on Ubuntu 14.04 LTS, which uses node 0.10.25 as it's standard-version. 


## Installation
Navigate to your Strider repository and run:

```bash
npm install strider-aws-codedeploy
```

After the repository is successfully installed, restart your Strider server. You should now see the plugin in the Strider UI.


## Configuration
After the plugin is installed, just navigate to your project and add it to your deployment routine. You can then configure the deployment with CodeDeploy. If you need further information about how to set up the required AWS credentials, please have a look at the 
[IAM User Guide](http://docs.aws.amazon.com/IAM/latest/UserGuide/).
![Credential Form][credential-form-img]
![Artifact Form][artifact-form-img]
![Deployment Form][deployment-form-img]


## Help, Suggestions, Bugs
In any case, feel free to open a GitHub issue.



[credential-form-img]: https://github.com/flxbe/strider-aws-codedeploy-images/blob/master/credentials_form.png?raw=true
[artifact-form-img]: https://github.com/flxbe/strider-aws-codedeploy-images/blob/master/artifact_form.png?raw=true
[deployment-form-img]: https://github.com/flxbe/strider-aws-codedeploy-images/blob/master/deployment_form.png?raw=true
