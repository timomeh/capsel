import { BaseAction } from "../classes/action"
import { BaseFacade } from "../classes/facade"
import { BaseRepo } from "../classes/repo"
import { BaseResource } from "../classes/resource"
import { BaseService } from "../classes/service"
import { DevStable } from "../concerns/devstable"
import { createInjectable } from "../concerns/injectable"
import { Memoizable } from "../concerns/memo"

export function createModule<const ModuleName extends string>(
  moduleName: ModuleName,
) {
  const Injectable = createInjectable<ModuleName>()

  abstract class Facade extends Injectable(BaseFacade) {
    static readonly __vla_module = moduleName
  }
  abstract class Service extends Injectable(BaseService) {
    static readonly __vla_module = moduleName
  }
  abstract class Repo extends Injectable(Memoizable(BaseRepo)) {
    static readonly __vla_module = moduleName
  }
  abstract class Action extends Injectable(BaseAction) {
    static readonly __vla_module = moduleName
  }
  abstract class Resource extends Injectable(DevStable(BaseResource)) {
    static readonly __vla_module = moduleName
  }

  return {
    Facade,
    Service,
    Repo,
    Action,
    Resource,

    // composable concerns
    Memoizable,
    DevStable,
  }
}
