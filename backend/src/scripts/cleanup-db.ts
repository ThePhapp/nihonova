console.error('Legacy destructive database cleanup disabled. Use a separate disposable test database; migrations preserve existing data.')
process.exitCode = 1
export {}
