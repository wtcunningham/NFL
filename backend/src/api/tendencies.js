import { Router } from 'express'
const router=Router({mergeParams:true})
router.get('/',async(req,res)=>{const window=req.query.window||'last4';res.json({offense:{neutral_pass_rate:0.58,play_action_pct:0.24,pace_sec_per_play:28.5,epa_per_play:0.06},defense:{blitz_rate:0.31,pressure_rate:0.35,zone_pct:0.62,epa_allowed:0.02},sample_sizes:{offense:240,defense:230},window,live:false,note:'Tendencies will be computed from nflfastR aggregates in the next version.'})})
export default router
