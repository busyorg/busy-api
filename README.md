# BUSY API

The API server for [Busy](https://busy.org/) - Blockchain-based social network where anyone can earn rewards :rocket:.

## Development

The project requires `node` at version `9.5.0`. If you are using a different version, you can use [NVM](https://github.com/creationix/nvm) to switch to this one.

[Yarn](https://yarnpkg.com/) package manager is used for this project. To install yarn, use

```shell
$ npm i -g yarn
```

You may require `sudo`.

**Let's start development**

But before that, you would need to have a [redis](https://redis.io/) server up and running.

```shell
$ yarn  # Install dependencies
$ yarn start  # Start server
```

You should be able to access the server at http://localhost:4000.
