export const errorHandler = () => {
  const onError = async (request) => {
    console.error(request.error.stack)
  }

  return {
    onError: onError,
  }
}
